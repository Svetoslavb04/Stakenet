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
   git clone https:  //github.com/your-username/stakenet-smart-contract.git
   ```

2. Navigate to the project directory:

   ```bash
   cd stakenet-smart-contract
   ```

3. Setup environment variables

   Create .env file or fulfill .env.example.\
   The following environment variables are required:\
   `SEPOLIA_URL`, `SEPOLIA_PRIVATE_KEY`, `ETHERSCAN_API_KEY`

4. Compile the smart contracts:

   ```bash
   npx hardhat compile
   ```

5. Deploy the smart contract to a local Hardhat network:

   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

Run `npx hardhat help` to see all available commands

## License

This project is licensed under the MIT License.

## Disclaimer

This smart contract is provided as-is and has not been audited for security. Use it at your own risk.

LimeSpark Contract link: https://sepolia.etherscan.io/address/0xD650c3BAF8Bf45c98Fcd2fEc4bE46Aa374cD3cE3#code
Stakenet Contract link:
