// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract LimeSpark is ERC20, Ownable {
    error TokensAlreadyMinted();

    uint256 public immutable starterTokens;

    constructor(uint256 _starterTokens) ERC20("LimeSpark", "LSK") {
        starterTokens = _starterTokens;
    }

    mapping(address => bool) accountHaveMinted;

    modifier starterTokensNotMinted(address account) {
        if (accountHaveMinted[account]) {
            revert TokensAlreadyMinted();
        }

        _;
    }

    function mintInitial() external starterTokensNotMinted(msg.sender) {
        accountHaveMinted[msg.sender] = true;
        _mint(msg.sender, starterTokens);
    }

    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }
}
