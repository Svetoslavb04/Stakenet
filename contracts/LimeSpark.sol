// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LimeSpark is ERC20, ERC20Burnable, Ownable {
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
