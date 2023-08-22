import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("LimeSpark", function () {
  async function deployFixture() {
    const LimeSpark = await ethers.getContractFactory("LimeSpark");
    const limeSpark = await LimeSpark.deploy(ethers.parseUnits("100", 18));

    const [owner, otherAccount] = await ethers.getSigners();

    return { limeSpark, owner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should deploy with correct name, symbol and starterTokens", async () => {
      const { limeSpark } = await loadFixture(deployFixture);

      const name = await limeSpark.name();
      const symbol = await limeSpark.symbol();
      const starterTokens = await limeSpark.starterTokens();

      expect(name).to.be.equal("LimeSpark");
      expect(symbol).to.be.equal("LSK");
      expect(starterTokens).to.be.equal(100000000000000000000n);
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
      it("Should revert if not owner tries to mint tokens", async () => {
        const { limeSpark, otherAccount } = await loadFixture(deployFixture);

        await expect(
          limeSpark.connect(otherAccount).mint(otherAccount, 10),
        ).to.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("Mint Initial", () => {
    describe("Action", () => {
      it("Should mint starter tokens", async () => {
        const { limeSpark, owner } = await loadFixture(deployFixture);

        await limeSpark.mintInitial();
        expect(await limeSpark.balanceOf(owner)).to.be.equal(
          ethers.parseUnits("100", 18),
        );
      });
    });

    describe("Validation", () => {
      it("Should revert if user tries to mint initial tokens more than once", async () => {
        const { limeSpark, otherAccount } = await loadFixture(deployFixture);

        await limeSpark.mintInitial();

        await expect(limeSpark.mintInitial()).to.revertedWithCustomError(
          limeSpark,
          "TokensAlreadyMinted",
        );
      });
    });
  });
});
