// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title StakenetTestERC20 Token TEST Contract
/// @dev An ERC20 token contract that acts maliciously and is used for testing.
/// @notice Do not use this contract in production, it is only for TEST purposes
/// This contract extends the ERC20 standard and introduces some malicious behavior
/// for testing purposes. It should not be used in any production environment.
contract StakenetTestERC20 is ERC20 {
    /// @dev Initializes the StakenetTestERC20 contract.
    constructor() ERC20("StakenetTestERC20", "STE") {}

    /// @dev Overrides the transfer function to avoid reverts.
    /// @param to The recipient address.
    /// @param amount The amount to transfer.
    /// @return Whether the transfer was successful or not.
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (to == address(0)) {
            return false;
        }

        bool success = _transferTokens(_msgSender(), to, amount);

        return success;
    }

    /// @dev Overrides the transferFrom function to avoid reverts.
    /// @param from The sender's address.
    /// @param to The recipient address.
    /// @param amount The amount to transfer.
    /// @return Whether the transfer was successful or not.
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (from == address(0) || to == address(0)) {
            return false;
        }

        bool allowanceSpent = _spendTokenAllowance(from, _msgSender(), amount);
        if (!allowanceSpent) {
            return false;
        }

        bool transfered = _transferTokens(from, to, amount);
        if (!transfered) {
            return false;
        }

        return true;
    }

    /// @dev Allows external callers to mint new tokens.
    /// @param amount The amount of tokens to mint.
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    ///@dev Internal function for transferring tokens.
    /// @param from The sender's address.
    /// @param to The recipient's address.
    /// @param amount The amount of tokens to transfer.
    /// @return Whether the transfer was successful or not.
    function _transferTokens(
        address from,
        address to,
        uint256 amount
    ) private returns (bool) {
        uint256 fromBalance = balanceOf(from);

        if (fromBalance < amount) {
            return false;
        }

        _burn(from, amount);
        _mint(to, amount);

        emit Transfer(from, to, amount);

        return true;
    }

    /// @dev Internal function for spending token allowance.
    /// @param owner The owner of the tokens.
    /// @param spender The spender of the tokens.
    /// @param amount The amount of tokens to spend.
    /// @return Whether the token allowance was spent successfully or not.
    function _spendTokenAllowance(
        address owner,
        address spender,
        uint256 amount
    ) private returns (bool) {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) {
                return false;
            }

            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }

        return true;
    }
}
