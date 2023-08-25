import { ethers } from "hardhat";

export async function main(erc20TokenAddress: string) {
  const Stakenet = "Stakenet";

  const lockDurationInSeconds = 86_000;
  const rewards = ethers.parseEther("100");
  const contractStakeLimit = ethers.parseEther("10000");
  const userStakeLimit = ethers.parseEther("10");

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
