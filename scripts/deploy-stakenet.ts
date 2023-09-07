import { ethers } from "hardhat";

export async function main(
  erc20TokenAddress: string,
  lockDurationInSeconds: number,
  rewards: string,
  contractStakeLimit: string,
  userStakeLimit: string,
) {
  const Stakenet = "Stakenet";

  const stakenet = await ethers.deployContract(Stakenet, [
    erc20TokenAddress,
    lockDurationInSeconds,
    rewards,
    contractStakeLimit,
    userStakeLimit,
  ]);

  await stakenet.waitForDeployment();

  console.log(`${Stakenet} deployed to ${stakenet.target}`);

  const limeSpark = await ethers.getContractAt("LimeSpark", erc20TokenAddress);

  const transferRewardTx = await limeSpark.transfer(
    await stakenet.getAddress(),
    rewards,
  );

  await transferRewardTx.wait();

  console.log(`Rewards transfered to ${Stakenet}.`);
}
