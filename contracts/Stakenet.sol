// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Stakenet is ERC20, ERC20Burnable {
    error AccountHasAlreadyStaked();
    error AccountHasNotStaked();
    error TokensNotUnlockedYet(uint256 unlockTime);
    error InvalidStakeLimit();
    error YieldPercentageTooBig(uint256 yield);

    ERC20 public erc20;

    uint256 public immutable lockDurationInSeconds;
    uint24 public immutable yieldPercentage;

    uint256 public rewards;

    uint256 public contractStakeLimit;
    uint256 public userStakeLimit;
    uint256 public userMinimumStake;

    mapping(address => bool) public userHasStaked;
    mapping(address => uint256) public userStakedTimestamp;

    modifier hasNotStaked() {
        if (userHasStaked[msg.sender]) {
            revert AccountHasAlreadyStaked();
        }

        _;
    }

    modifier hasStaked() {
        if (!userHasStaked[msg.sender]) {
            revert AccountHasNotStaked();
        }

        _;
    }

    constructor(
        address erc20TokenAddress,
        uint256 _lockDurationInSeconds,
        uint256 _rewards,
        uint256 _contractStakeLimit,
        uint256 _userStakeLimit
    ) ERC20("StakedLimeSpark", "SLSK") {
        erc20 = ERC20(erc20TokenAddress);

        lockDurationInSeconds = _lockDurationInSeconds;
        rewards = _rewards;

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

    function stake(uint256 _amount) external hasNotStaked {
        erc20.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
        userHasStaked[msg.sender] = true;
        userStakedTimestamp[msg.sender] = block.timestamp;
    }

    function transferPosition(address _to) external hasStaked {
        userStakedTimestamp[_to] = Math.max(
            userStakedTimestamp[_to],
            userStakedTimestamp[msg.sender]
        );

        _transfer(msg.sender, _to, balanceOf(msg.sender));
    }

    function withdraw() external hasStaked {
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

        erc20.transfer(msg.sender, (balanceOf(msg.sender) + accumulatedYield));

        _burn(msg.sender, balanceOf(msg.sender));
    }

    function yieldDecimals() external pure returns (uint8) {
        return 4;
    }

    function calculateYield() internal view returns (uint24) {
        uint256 yield = (rewards * 100_0000) / contractStakeLimit;

        if (yield > type(uint24).max) {
            revert YieldPercentageTooBig(yield);
        }

        return uint24(yield);
    }

    function calculateMinStake() public view returns (uint256) {
        return 100_0000 / yieldPercentage;
    }

    function calculateAccumulatedYield(
        uint256 tokens
    ) internal view returns (uint256 accumulatedYield) {
        accumulatedYield =
            (SafeMath.mul(tokens, 100_0000 + yieldPercentage) / 100_0000) -
            tokens;
    }
}
