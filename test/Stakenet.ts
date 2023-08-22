import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Stakenet", function () {
  async function deployFixture() {
    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy();

    await stakenet.waitForDeployment();

    const limeSpark = await ethers.getContractAt(
      "LimeSpark",
      await stakenet.limeSpark(),
    );

    const [stakenetOwner, otherAccount] = await ethers.getSigners();

    return { stakenet, limeSpark, stakenetOwner, otherAccount };
  }

  async function deployFixtureWithStakenetApproval() {
    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy();

    await stakenet.waitForDeployment();

    const limeSpark = await ethers.getContractAt(
      "LimeSpark",
      await stakenet.limeSpark(),
    );

    const [stakenetOwner, otherAccount] = await ethers.getSigners();

    await limeSpark.connect(otherAccount).mintInitial();
    await limeSpark
      .connect(otherAccount)
      .approve(await stakenet.getAddress(), ethers.parseUnits("100", 18));

    return { stakenet, limeSpark, stakenetOwner, otherAccount };
  }

  describe("Deployment", () => {
    it("Should deploy with correct name, symbol and starterTokens", async () => {
      const { stakenet } = await loadFixture(deployFixture);

      const name = await stakenet.name();
      const symbol = await stakenet.symbol();

      expect(name).to.be.equal("StakedLimeSpark");
      expect(symbol).to.be.equal("SLSK");
    });

    it("Should deploy LimeStart contract with correct starter tokens", async () => {
      const { limeSpark } = await loadFixture(deployFixture);

      const starterTokens = await limeSpark.starterTokens();

      expect(starterTokens).to.be.equal(ethers.parseUnits("100", 18));
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
        const { stakenet, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenet.connect(stakenetOwner).mint(otherAccount, 10);
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

  describe("Stake", () => {
    describe("Action", () => {
      it("Should correctly transfer tokens from account to stakenet's account", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseUnits("99", 18);

        await stakenet.connect(otherAccount).stake(stake);

        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(
          ethers.parseUnits("1", 18),
        );
        expect(
          await limeSpark.balanceOf(await stakenet.getAddress()),
        ).to.be.equal(stake);
      });

      it("Should correctly mints StakedLimeStark upon stake in stakenet", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseUnits("99", 18);

        await stakenet.connect(otherAccount).stake(stake);

        expect(await stakenet.balanceOf(otherAccount)).to.be.equal(stake);
      });
    });

    describe("Validations", () => {
      it("Should revert if user has already staked", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseUnits("20", 18);

        await stakenet.connect(otherAccount).stake(stake);

        await expect(
          stakenet.connect(otherAccount).stake(stake),
        ).to.revertedWithCustomError(stakenet, "AccountHasAlreadyStaked");
      });
    });
  });

  describe("TransferPosition", () => {
    describe("Action", () => {
      it("Should transfer msg.sender's position to a given user", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseUnits("10", 18);

        await stakenet.connect(otherAccount).stake(ethers.parseUnits("10", 18));
        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.balanceOf(stakenetOwner)).to.be.equal(stake);
      });
    });

    describe("Validations", () => {
      it("Should revert when trying to transfer position but does not own one", async () => {
        const { stakenet, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        await expect(
          stakenet.transferPosition(otherAccount),
        ).to.revertedWithCustomError(stakenet, "AccountHasNotStaked");
      });
    });
  });
});
