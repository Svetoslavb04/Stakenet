// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LimeSpark Token Contract
/// @dev An ERC20 token contract that allows minting of initial tokens and additional tokens by the owner.
contract LimeSpark is ERC20, Ownable {
    /// @dev Error indicating that the initial tokens have already been minted for an account.
    error TokensAlreadyMinted();

    /// @dev Total number of tokens that will be able for a user to mint initially.
    uint256 public immutable starterTokens;

    /// @dev Initializes the LimeSpark contract with the specified number of starter tokens.
    /// @param _starterTokens Number of tokens that can be mintent initially.
    constructor(uint256 _starterTokens) ERC20("LimeSpark", "LSK") {
        starterTokens = _starterTokens;
    }

    /// @dev Mapping to track whether an account has already minted the starter tokens.
    mapping(address => bool) accountHaveMinted;

    /// @dev Modifier to ensure that an account hasn't already minted starter tokens.
    /// @param account The account to check for starter token minting.
    modifier starterTokensNotMinted(address account) {
        if (accountHaveMinted[account]) {
            revert TokensAlreadyMinted();
        }

        _;
    }

    ///@dev Mints the initial starter tokens for the calling account.
    ///     Can only be called once per account.
    function mintInitial() external starterTokensNotMinted(msg.sender) {
        accountHaveMinted[msg.sender] = true;
        _mint(msg.sender, starterTokens);
    }

    /// @dev Mints a specified amount of tokens to the given address.
    ///      Only callable by the contract owner.
    /// @param _to The address to which tokens will be minted.
    /// @param _amount The amount of tokens to be minted.
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }
}
