import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotEnvConfig();

const lazyImport = async (module: any) => {
  return await import(module);
};

task("deploy-lime-spark", "Deploys LimeSpark ERC20 Contract")
  .addParam(
    "starterTokens",
    "Please provide starter tokens available for initial miniting",
  )
  .setAction(async ({ starterTokens }) => {
    const { main } = await lazyImport("./scripts/deploy-lime-spark.ts");
    await main(starterTokens);
  });

task("deploy-stakenet", "Deploys Stakenet DeFi contract")
  .addParam("erc20TokenAddress", "Please provide ERC20 token address")
  .addParam(
    "lockDurationInSeconds",
    "Provide duration for which tokens will be locked",
  )
  .addParam("rewards", "Total rewards that are going to be paid in WEI")
  .addParam(
    "contractStakeLimit",
    "The total tokens that can be staked in the contract",
  )
  .addParam(
    "userStakeLimit",
    "The total tokens that an account can stake in the contract",
  )
  .setAction(
    async ({
      erc20TokenAddress,
      lockDurationInSeconds,
      rewards,
      contractStakeLimit,
      userStakeLimit,
    }) => {
      const { main } = await lazyImport("./scripts/deploy-stakenet.ts");
      await main(
        erc20TokenAddress,
        lockDurationInSeconds,
        rewards,
        contractStakeLimit,
        userStakeLimit,
      );
    },
  );

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
