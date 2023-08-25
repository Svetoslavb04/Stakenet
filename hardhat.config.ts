import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotEnvConfig();

const lazyImport = async (module: any) => {
  return await import(module);
};

task(
  "deploy-stakenet-with-erc20",
  "Deploys Stakenet by passing erc20 token address",
)
  .addParam("erc20TokenAddress", "Please provide ERC20 token address")
  .setAction(async ({ erc20TokenAddress }) => {
    const { main } = await lazyImport(
      "./scripts/deploy-stakenet-with-erc20.ts",
    );
    await main(erc20TokenAddress);
  });

const config: HardhatUserConfig = {
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 11155111,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY || "Invalid"],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.8.19",
  },
};

export default config;
