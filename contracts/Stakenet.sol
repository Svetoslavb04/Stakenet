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

    ERC20 public erc20;

    uint256 public immutable lockDurationInSeconds;
    uint32 public immutable yieldPercentage;

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
        uint32 _yieldPercentage
    ) ERC20("StakedLimeSpark", "SLSK") {
        erc20 = ERC20(erc20TokenAddress);
        lockDurationInSeconds = _lockDurationInSeconds;
        yieldPercentage = _yieldPercentage;
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

        uint256 accumulatedYield = calculateYield(balanceOf(msg.sender));

        erc20.transfer(msg.sender, (balanceOf(msg.sender) + accumulatedYield));

        _burn(msg.sender, balanceOf(msg.sender));
    }

    function yieldDecimals() external pure returns (uint8) {
        return 4;
    }

    function calculateYield(
        uint256 tokens
    ) internal view returns (uint256 accumulatedYield) {
        accumulatedYield =
            (SafeMath.mul(tokens, 100_0000 + yieldPercentage) / 100_0000) -
            tokens;
    }
}
