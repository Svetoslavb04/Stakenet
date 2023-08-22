// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { LimeSpark } from "./LimeSpark.sol";

contract Stakenet is ERC20, ERC20Burnable, Ownable {
    error AccountHasAlreadyStaked();

    LimeSpark public limeSpark;

    mapping(address => bool) userHasStaked;

    modifier hasNotStaked(address account) {
        if (userHasStaked[account]) {
            revert AccountHasAlreadyStaked();
        }

        _;
    }

    constructor() ERC20("StakedLimeSpark", "SLSK") {
        limeSpark = new LimeSpark(100 * 10 ** 18);
    }

    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    function stake(uint256 _amount) external hasNotStaked(msg.sender) {
        limeSpark.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
        userHasStaked[msg.sender] = true;
    }
}
