import { ethers } from "hardhat";

export async function main(starterTokens: string) {
  const LimeSpark = "LimeSpark";

  const limeSpark = await ethers.deployContract(LimeSpark, [
    ethers.toBigInt(starterTokens),
  ]);

  await limeSpark.waitForDeployment();

  console.log(`${LimeSpark} deployed to ${limeSpark.target}`);

  const mintTx = await limeSpark.mintInitial();
  await mintTx.wait();

  const [limeSparkOwner] = await ethers.getSigners();

  console.log(
    `${limeSparkOwner.address} now owns ${await limeSpark.balanceOf(
      limeSparkOwner,
    )} LimeSparks`,
  );
}
