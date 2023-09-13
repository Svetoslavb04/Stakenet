# Stakenet

## Overview

The Stakenet Smart Contract is an Ethereum-based contract that allows users to stake a certain ERC20 token and earn rewards based on a predefined yield percentage. This contract is implemented using Solidity and utilizes OpenZeppelin libraries for ERC20 functionality.

## Features

- Stake ERC20 tokens to earn rewards.
- Transfer staking position to another address.
- Withdraw staked tokens along with accumulated yield after a lock duration.
- Dynamic yield calculation based on the total rewards and stake limits.
- User-specific stake limits and minimum staking amount.

## Prerequisites

- [Node.js](https://nodejs.org/) installed.
- [Hardhat](https://hardhat.org/) development environment set up.

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/Svetoslavb04/Stakenet.git
   ```

2. Navigate to the project directory:

   ```bash
   cd Stakenet
   ```

3. Setup environment variables

   Create .env file or fulfill .env.example.\
   The following environment variables are required:\
   `SEPOLIA_URL`, `SEPOLIA_PRIVATE_KEY`, `ETHERSCAN_API_KEY`

4. Compile the smart contracts:

   ```bash
   npx hardhat compile
   ```

5. Deploy the LimeSpark smart contract to Sepolia testnet:

   ```bash
   npx hardhat deploy-lime-spark --network sepolia --starter-tokens <STARTER_TOKENS>
   ```

6. Deploy the Stakenet smart contract to Sepolia testnet:

   ```bash
   npx hardhat deploy-stakenet --network sepolia --erc20-token-address <ADDRESS_OF_ERC20> --lock-duration-in-seconds <LOCK_DURATION> --rewards <REWARDS> --contract-stake-limit <CONTRACT_STAKE_LIMIT> --user-stake-limit <USER_STAKE_LIMIT>
   ```

   Run `npx hardhat help` to see all available commands

## License

This project is licensed under the MIT License.

## Disclaimer

This smart contract is provided as-is and has not been audited for security. Use it at your own risk.

LimeSpark Contract address: 0x2BdFb6a7B89e933B0A8c34E3dcc32E8C684c7738\
LimeSpark Contract link: https://sepolia.etherscan.io/address/0x2BdFb6a7B89e933B0A8c34E3dcc32E8C684c7738#code

Stakenet Contract address: 0x258fCe6D2F82A45Fed7120211aa445F1fa16E05f\
Stakenet Contract link: https://sepolia.etherscan.io/address/0x258fCe6D2F82A45Fed7120211aa445F1fa16E05f#code

Example Stakenet deploy command:\
`npx hardhat deploy-stakenet --erc20-token-address 0x2BdFb6a7B89e933B0A8c34E3dcc32E8C684c7738 --lock-duration-in-seconds 86000 --rewards 100000000000000000000 --contract-stake-limit 300000000000000000000 --user-stake-limit 100000000000000000000`
