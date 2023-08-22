import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Stakenet", function () {
  async function deployFixture() {
    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy();

    const [owner, otherAccount] = await ethers.getSigners();

    return { stakenet, owner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should deploy with correct name, symbol and starterTokens", async () => {
      const { stakenet } = await loadFixture(deployFixture);

      const name = await stakenet.name();
      const symbol = await stakenet.symbol();

      expect(name).to.be.equal("StakedLimeSpark");
      expect(symbol).to.be.equal("SLSK");
    });
  });

  describe("Decimals", () => {
    it("Should return the correct decimals for user representation", async () => {
      const { stakenet } = await loadFixture(deployFixture);
      expect(await stakenet.decimals()).to.be.equal(18);
    });
  });

  describe("Mint", () => {
    describe("Action", () => {
      it("Should mint tokens to a given addess", async () => {
        const { stakenet, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenet.connect(owner).mint(otherAccount, 10);
        expect(await stakenet.balanceOf(otherAccount)).to.be.equal(10);
      });
    });

    describe("Validation", () => {
      it("Should revert if not owner tries to mint tokens", async () => {
        const { stakenet, otherAccount } = await loadFixture(deployFixture);

        await expect(
          stakenet.connect(otherAccount).mint(otherAccount, 10),
        ).to.revertedWith("Ownable: caller is not the owner");
      });
    });
  });
});
