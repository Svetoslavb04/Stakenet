// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { LimeSpark } from "./LimeSpark.sol";

contract Stakenet is ERC20, ERC20Burnable, Ownable {
    LimeSpark public limeSpark;

    constructor() ERC20("StakedLimeSpark", "SLSK") {
        limeSpark = new LimeSpark(100 * 10 ** 18);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
