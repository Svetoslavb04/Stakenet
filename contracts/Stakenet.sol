// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";

/// @title Stakenet Smart Contract
/// @dev The contract that allows staking and yield farming.
/// @dev The staking position is represented an ERC20 token
contract Stakenet is ERC20 {
    /// Errors:

    /// @dev Error indicating that an account has already staked tokens. Account can stake only once.
    error AccountHasAlreadyStaked();

    /// @dev Error indicating that an account has not staked tokens.
    error AccountHasNotStaked();

    /// @dev Error indicating that staked tokens are not yet unlocked.
    error TokensNotUnlockedYet(uint256 unlockTime);

    /// @dev Error indicating that a given amount is less than the position of a user.
    /// @notice An operation should be done with the whole position, not partially.
    error AmountLessThanPosition(uint256 amount, uint256 position);

    /// @dev Error indicating an invalid stake limit configuration.
    error InvalidStakeLimit();

    /// @dev Error indicating that the specified yield percentage is too large.
    error YieldPercentageTooBig(uint256 yield);

    /// @dev Error indicating that a staking amount is above the limits.
    error StakeTooHigh(uint256 userStakeLimit, uint256 contractStakeLimit);

    /// @dev Error indicating that a staking amount is too low and the user will not receive a reward.
    error StakeTooLow(uint256 minimumStake);

    /// @dev Error indicating that a transfer of ERC20 tokens has failed
    error ERC20TransferFailed();

    /// Events:

    /// @dev Event emitted when an account successfully stakes tokens.
    event Staked(address indexed account, uint256 amount);

    /// @dev Event emitted when an account successfully withdraws staked tokens and yield.
    event Withdrawn(address indexed account, uint256 amount);

    /// @dev Event emitted when the contract's stake limits are updated.
    event StakeLimitsUpdated(uint256 newContractLimit, uint256 newUserLimit);

    /// Global state variables:

    /// @dev The ERC20 token contract used for staking.
    ERC20 public immutable erc20;

    /// @dev The duration for which staked tokens are locked.
    uint256 public immutable lockDurationInSeconds;

    /// @dev The yield percentage for yield farming represented with 4 decimals.
    uint24 public immutable yieldPercentage;

    /// @dev The total rewards available for yield farming.
    uint256 public immutable totalRewards;

    /// @dev The remaining rewards available for yield farming.
    uint256 public rewards;

    /// @dev The maximum number of tokens that can be staked in the contract.
    /// @notice Changes are made on each stake to maintain the original yield percentage.
    uint256 public contractStakeLimit;

    /// @dev The maximum number of tokens a user can stake.
    uint256 public userStakeLimit;

    /// @dev The minimum staking amount for a user based on yield percentage.
    uint256 public immutable userMinimumStake;

    /// @dev Mapping to track whether an account has staked tokens.
    mapping(address => bool) public userHasStaked;

    /// @dev Mapping to store the staked timestamp for each user.
    mapping(address => uint256) public userStakedTimestamp;

    /// Modifiers:

    /// @dev Modifier to ensure that an account has not staked tokens.
    /// @param user The user that should have not staked
    modifier hasNotStaked(address user) {
        if (userHasStaked[user]) {
            revert AccountHasAlreadyStaked();
        }

        _;
    }

    /// @dev Modifier to ensure that an account has staked tokens.
    /// @param user The user that should have staked
    modifier hasStaked(address user) {
        if (!userHasStaked[user]) {
            revert AccountHasNotStaked();
        }

        _;
    }

    /// @dev Modifier to ensure that amount is not less than the position.
    /// @param user The user that should have staked
    /// @param amount The amount that will be compared
    modifier amountEqualToPosition(address user, uint256 amount) {
        uint256 balance = balanceOf(user);

        if (amount < balanceOf(user)) {
            revert AmountLessThanPosition(amount, balance);
        }
        _;
    }

    /// @dev Contract constructor.
    /// @param erc20TokenAddress The address of the ERC20 token used for staking.
    /// @param _lockDurationInSeconds The duration for which staked tokens are locked.
    /// @param _rewards The total rewards available for yield farming.
    /// @param _contractStakeLimit The maximum number of tokens that can be staked in the contract.
    /// @param _userStakeLimit The maximum number of tokens a user can stake.
    /// @notice The yield percentage is calculated based on the rewards and the contractStakeLimit
    constructor(
        address erc20TokenAddress,
        uint256 _lockDurationInSeconds,
        uint256 _rewards,
        uint256 _contractStakeLimit,
        uint256 _userStakeLimit
    ) ERC20("StakedToken", "STKN") {
        erc20 = ERC20(erc20TokenAddress);

        lockDurationInSeconds = _lockDurationInSeconds;
        totalRewards = _rewards;
        rewards = _rewards;

        // Check and set stake limits
        if (
            _contractStakeLimit == 0 ||
            _userStakeLimit == 0 ||
            _userStakeLimit > _contractStakeLimit
        ) {
            revert InvalidStakeLimit();
        }

        contractStakeLimit = _contractStakeLimit;
        userStakeLimit = _userStakeLimit;

        yieldPercentage = calculateYield();

        userMinimumStake = calculateMinStake();
    }

    /// Functions:

    /// @dev Stake a specified amount of tokens to start yield farming.
    /// @param _amount The amount of tokens to stake.
    function stake(uint256 _amount) external hasNotStaked(_msgSender()) {
        if (contractStakeLimit < _amount || userStakeLimit < _amount) {
            revert StakeTooHigh(userStakeLimit, contractStakeLimit);
        }
        if (userMinimumStake > _amount) {
            revert StakeTooLow(userMinimumStake);
        }

        _mint(msg.sender, _amount);

        userHasStaked[msg.sender] = true;
        userStakedTimestamp[msg.sender] = block.timestamp;

        uint256 accumulatedYield = calculateAccumulatedYield(
            balanceOf(msg.sender)
        );

        rewards -= accumulatedYield;
        contractStakeLimit = calculateContractStakeLimit();

        if (contractStakeLimit < userStakeLimit) {
            userStakeLimit = contractStakeLimit;
        }

        emit StakeLimitsUpdated(contractStakeLimit, userStakeLimit);
        emit Staked(msg.sender, _amount);

        bool success = erc20.transferFrom(msg.sender, address(this), _amount);

        if (!success) {
            revert ERC20TransferFailed();
        }
    }

    /// @dev Transfer staking position to another address.
    /// @param _to The address to which the staking position will be transferred.
    /// @param _amount Should be equal to the position of the user
    function transfer(
        address _to,
        uint256 _amount
    )
        public
        override
        hasStaked(_msgSender())
        amountEqualToPosition(_msgSender(), _amount)
        returns (bool)
    {
        address owner = _msgSender();

        userStakedTimestamp[_to] = Math.max(
            userStakedTimestamp[_to],
            userStakedTimestamp[msg.sender]
        );

        _transfer(owner, _to, _amount);

        return true;
    }

    /// @dev Approve a spender to transfer you staking position
    /// @param spender The spender who can transfer your position.
    /// @param amount Should be equal to the staking position
    function approve(
        address spender,
        uint256 amount
    )
        public
        override
        hasStaked(_msgSender())
        amountEqualToPosition(_msgSender(), amount)
        returns (bool)
    {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    )
        public
        override
        hasStaked(_from)
        amountEqualToPosition(_from, _amount)
        returns (bool)
    {
        address spender = _msgSender();

        userStakedTimestamp[_to] = Math.max(
            userStakedTimestamp[_to],
            userStakedTimestamp[_from]
        );

        _spendAllowance(_from, spender, _amount);
        _transfer(_from, _to, _amount);

        return true;
    }

    /// @dev Withdraw staked tokens along with accumulated yield after the lock duration.
    function withdraw() external hasStaked(_msgSender()) {
        if (
            block.timestamp <=
            userStakedTimestamp[msg.sender] + lockDurationInSeconds
        ) {
            revert TokensNotUnlockedYet(
                userStakedTimestamp[msg.sender] + lockDurationInSeconds
            );
        }

        uint256 accumulatedYield = calculateAccumulatedYield(
            balanceOf(msg.sender)
        );

        uint256 stakedTokens = balanceOf(msg.sender);

        _burn(msg.sender, stakedTokens);

        emit Withdrawn(msg.sender, stakedTokens + accumulatedYield);

        bool success = erc20.transfer(
            msg.sender,
            stakedTokens + accumulatedYield
        );

        if (!success) {
            revert ERC20TransferFailed();
        }
    }

    /// @dev Get the number of decimal places for the yield percentage.
    /// @return The number of decimal places.
    function yieldDecimals() external pure returns (uint8) {
        return 4;
    }

    /// @dev Calculate the minimum stake allowed based on yield percentage.
    function calculateMinStake() public view returns (uint256) {
        return (100_0000 / yieldPercentage) + 1;
    }

    ///Internal functions:

    /// @dev Calculate the yield percentage based on rewards and stake limits.
    function calculateYield() internal view returns (uint24) {
        uint256 yield = (rewards * 100_0000) / contractStakeLimit;

        if (yield > type(uint24).max) {
            revert YieldPercentageTooBig(yield);
        }

        return uint24(yield);
    }

    /// @dev Calculate the contract's stake limit based on rewards and yield percentage.
    function calculateContractStakeLimit() internal view returns (uint256) {
        return (rewards * 100_0000) / yieldPercentage;
    }

    /// @dev Calculate the accumulated yield for a specified number of tokens.
    /// @param tokens The number of tokens to calculate yield for.
    /// @return accumulatedYield The accumulated yield.
    function calculateAccumulatedYield(
        uint256 tokens
    ) internal view returns (uint256 accumulatedYield) {
        accumulatedYield =
            (SafeMath.mul(tokens, 100_0000 + yieldPercentage) / 100_0000) -
            tokens;
    }
}
