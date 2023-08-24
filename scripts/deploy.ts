import { ethers } from "hardhat";

async function main() {
  const contractName = "Contract";

  const contract = await ethers.deployContract(contractName);

  await contract.waitForDeployment();

  console.log(`${contractName} deployed to ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
});
