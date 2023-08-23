import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
  mine,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Stakenet", function () {
  async function deployFixture() {
    const oneDayInSeconds = 86_000;

    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy(oneDayInSeconds);

    await stakenet.waitForDeployment();

    const limeSpark = await ethers.getContractAt(
      "LimeSpark",
      await stakenet.limeSpark(),
    );

    const [stakenetOwner, otherAccount] = await ethers.getSigners();

    return {
      stakenet,
      limeSpark,
      stakenetOwner,
      otherAccount,
      lockDuration: oneDayInSeconds,
    };
  }

  async function deployFixtureWithStakenetApproval() {
    const oneDayInSeconds = 86_000;

    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy(oneDayInSeconds);

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

    return {
      stakenet,
      limeSpark,
      stakenetOwner,
      otherAccount,
      lockDuration: oneDayInSeconds,
    };
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

      it("Should correctly set stake timestamp per user", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseUnits("99", 18);

        await stakenet.connect(otherAccount).stake(stake);

        const latestBlockTimestamp = await time.latest();

        expect(await stakenet.userStakedTimestamp(otherAccount)).to.be.equal(
          latestBlockTimestamp,
        );
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

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.balanceOf(stakenetOwner)).to.be.equal(stake);
      });

      it("Should set the position of the user to be the sum of its current plus the new one", async () => {
        const { stakenet, limeSpark, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        const stakenetAddress = await stakenet.getAddress();

        await limeSpark.connect(stakenetOwner).mintInitial();
        await limeSpark
          .connect(stakenetOwner)
          .approve(stakenetAddress, ethers.parseUnits("100", 18));

        await limeSpark.connect(otherAccount).mintInitial();
        await limeSpark
          .connect(otherAccount)
          .approve(stakenetAddress, ethers.parseUnits("100", 18));

        await stakenet
          .connect(stakenetOwner)
          .stake(ethers.parseUnits("10", 18));

        await mine(10);

        await stakenet.connect(otherAccount).stake(ethers.parseUnits("10", 18));

        await mine(10);

        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.balanceOf(stakenetOwner)).to.be.equal(
          ethers.parseUnits("20", 18),
        );
      });

      it("Should set the correct lock date of the new position of the receiver. Should be the max of the two positions", async () => {
        const { stakenet, limeSpark, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        const stakenetAddress = await stakenet.getAddress();

        await limeSpark.connect(stakenetOwner).mintInitial();
        await limeSpark
          .connect(stakenetOwner)
          .approve(stakenetAddress, ethers.parseUnits("100", 18));

        await limeSpark.connect(otherAccount).mintInitial();
        await limeSpark
          .connect(otherAccount)
          .approve(stakenetAddress, ethers.parseUnits("100", 18));

        await stakenet
          .connect(stakenetOwner)
          .stake(ethers.parseUnits("10", 18));

        await mine(10);

        await stakenet.connect(otherAccount).stake(ethers.parseUnits("10", 18));

        await mine(10);

        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.userStakedTimestamp(stakenetOwner)).to.be.equal(
          await stakenet.userStakedTimestamp(otherAccount),
        );
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

  describe("Withdraw", () => {
    describe("Action", () => {
      it("Should withdraw the tokens if transaction is after the lock date", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await stakenet.connect(otherAccount).stake(ethers.parseUnits("10", 18));

        const oneDay = 86_000;

        await mine(2, { interval: oneDay });

        await stakenet.connect(otherAccount).withdraw();

        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(
          ethers.parseUnits("100", 18),
        );
      });
    });

    describe("Validation", () => {
      it("Should revert if try to withdraw before lock date", async () => {
        const { stakenet, otherAccount, lockDuration } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await stakenet.connect(otherAccount).stake(ethers.parseUnits("10", 18));

        const userStakeTime = await stakenet.userStakedTimestamp(otherAccount);

        await expect(stakenet.connect(otherAccount).withdraw())
          .to.revertedWithCustomError(stakenet, "TokensNotUnlockedYet")
          .withArgs(ethers.getNumber(userStakeTime) + lockDuration);
      });

      it("Should revert if not staked", async () => {
        const { stakenet, otherAccount } = await loadFixture(deployFixture);

        await expect(
          stakenet.connect(otherAccount).withdraw(),
        ).to.revertedWithCustomError(stakenet, "AccountHasNotStaked");
      });
    });
  });
});
