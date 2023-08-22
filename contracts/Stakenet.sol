// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { LimeSpark } from "./LimeSpark.sol";

contract Stakenet is ERC20, ERC20Burnable, Ownable {
    error AccountHasAlreadyStaked();
    error AccountHasNotStaked();

    LimeSpark public limeSpark;

    uint256 public immutable lockDurationInSeconds;

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
        uint256 _lockDurationInSeconds
    ) ERC20("StakedLimeSpark", "SLSK") {
        limeSpark = new LimeSpark(100 * 10 ** 18);
        lockDurationInSeconds = _lockDurationInSeconds;
    }

    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    function stake(uint256 _amount) external hasNotStaked {
        limeSpark.transferFrom(msg.sender, address(this), _amount);
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
}
