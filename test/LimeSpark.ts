import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("LimeSpark", function () {
  async function deployFixture() {
    const LimeSpark = await ethers.getContractFactory("LimeSpark");
    const limeSpark = await LimeSpark.deploy();

    const [owner, otherAccount] = await ethers.getSigners();

    return { limeSpark, owner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should deploy with correct name, symbol and supply", async () => {
      const { limeSpark } = await loadFixture(deployFixture);

      const _name = await limeSpark.name();
      const _symbol = await limeSpark.symbol();

      expect(_name).to.be.equal("LimeSpark");
      expect(_symbol).to.be.equal("LSK");
    });
  });

  describe("Decimals", () => {
    it("Should return the correct decimals for user representation", async () => {
      const { limeSpark } = await loadFixture(deployFixture);

      expect(await limeSpark.decimals()).to.be.equal(18);
    });
  });

  describe("Mint", () => {
    describe("Action", () => {
      it("Should mint tokens to a given addess", async () => {
        const { limeSpark, owner, otherAccount } =
          await loadFixture(deployFixture);

        await limeSpark.connect(owner).mint(otherAccount, 10);
        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(10);
      });
    });
    describe("Validation", () => {
      it("Should revert if not owneer tries to mint tokens", async () => {
        const { limeSpark, otherAccount } = await loadFixture(deployFixture);

        await expect(
          limeSpark.connect(otherAccount).mint(otherAccount, 10),
        ).to.revertedWith("Ownable: caller is not the owner");
      });
    });
  });
});
