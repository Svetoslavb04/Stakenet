import { ethers } from "hardhat";

export async function main() {
  const LimeSpark = "LimeSpark";

  const limeSpark = await ethers.deployContract(LimeSpark, [
    ethers.parseUnits("100", 18),
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
