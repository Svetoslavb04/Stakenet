import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
  mine,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Stakenet", function () {
  async function deployFixture() {
    const oneDayInSeconds = 86_000;

    const [stakenetOwner, otherAccount] = await ethers.getSigners();

    const LimeSpark = await ethers.getContractFactory("LimeSpark");
    const limeSpark = await LimeSpark.deploy(ethers.parseEther("100"));

    await limeSpark.waitForDeployment();

    await limeSpark.mintInitial();

    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.connect(stakenetOwner).deploy(
      await limeSpark.getAddress(),
      oneDayInSeconds,
      ethers.parseEther("100"),
      ethers.parseEther("1000"),
      ethers.parseEther("100"),
    );

    await stakenet.waitForDeployment();

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

    const LimeSpark = await ethers.getContractFactory("LimeSpark");
    const limeSpark = await LimeSpark.deploy(ethers.parseEther("100"));

    await limeSpark.waitForDeployment();

    const Stakenet = await ethers.getContractFactory("Stakenet");
    const stakenet = await Stakenet.deploy(
      await limeSpark.getAddress(),
      oneDayInSeconds,
      ethers.parseEther("100"),
      ethers.parseEther("1000"),
      ethers.parseEther("100"),
    );

    await stakenet.waitForDeployment();

    const [stakenetOwner, otherAccount] = await ethers.getSigners();

    await limeSpark.connect(stakenetOwner).mintInitial();
    await limeSpark.connect(otherAccount).mintInitial();
    await limeSpark
      .connect(otherAccount)
      .approve(await stakenet.getAddress(), ethers.parseEther("100"));

    return {
      stakenet,
      limeSpark,
      stakenetOwner,
      otherAccount,
      lockDuration: oneDayInSeconds,
    };
  }

  describe("Deployment", () => {
    describe("Action", () => {
      it("Should deploy with correct name, symbol, rewards, contractStakeLimit, userStakeLimit, Yield percentage", async () => {
        const { stakenet } = await loadFixture(deployFixture);

        const name = await stakenet.name();
        const symbol = await stakenet.symbol();
        const rewards = await stakenet.rewards();
        const contractStakeLimit = await stakenet.contractStakeLimit();
        const userStakeLimit = await stakenet.userStakeLimit();
        const yieldPercentage = await stakenet.yieldPercentage();

        expect(name).to.be.equal("StakedToken");
        expect(symbol).to.be.equal("STKN");
        expect(rewards).to.be.equal(ethers.parseEther("100"));
        expect(contractStakeLimit).to.be.equal(ethers.parseUnits("1", 21));
        expect(userStakeLimit).to.be.equal(ethers.parseUnits("1", 20));
        expect(yieldPercentage).to.be.equal(10_0000n);
      });
    });

    describe("Validations", async () => {
      it("Should revert with contract stake limit set to 0", async () => {
        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseUnits("100", 18));

        await limeSpark.waitForDeployment();
        const Stakenet = await ethers.getContractFactory("Stakenet");

        await expect(
          Stakenet.deploy(
            await limeSpark.getAddress(),
            0,
            ethers.parseEther("100"),
            0,
            ethers.parseUnits("1", 19),
          ),
        ).to.revertedWithCustomError(Stakenet, "InvalidStakeLimit");
      });

      it("Should revert with user stake limit set to 0", async () => {
        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseUnits("100", 18));

        await limeSpark.waitForDeployment();
        const Stakenet = await ethers.getContractFactory("Stakenet");

        await expect(
          Stakenet.deploy(
            await limeSpark.getAddress(),
            0,
            ethers.parseEther("100"),
            ethers.parseUnits("1", 19),
            0,
          ),
        ).to.revertedWithCustomError(Stakenet, "InvalidStakeLimit");
      });

      it("Should revert if user stake limit is greater than contract stake limit", async () => {
        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseUnits("100", 18));

        await limeSpark.waitForDeployment();
        const Stakenet = await ethers.getContractFactory("Stakenet");

        await expect(
          Stakenet.deploy(
            await limeSpark.getAddress(),
            0,
            ethers.parseEther("100"),
            ethers.parseUnits("1", 19),
            ethers.parseUnits("12", 19),
          ),
        ).to.revertedWithCustomError(Stakenet, "InvalidStakeLimit");
      });

      it("Should revert if yield is too big (grater than uint32 max value)", async () => {
        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseUnits("100", 18));

        await limeSpark.waitForDeployment();
        const Stakenet = await ethers.getContractFactory("Stakenet");

        await expect(
          Stakenet.deploy(
            await limeSpark.getAddress(),
            0,
            ethers.parseEther("1"),
            "59604644775390625",
            ethers.parseUnits("1", 0),
          ),
        ).to.revertedWithCustomError(Stakenet, "YieldPercentageTooBig");
      });
    });
  });

  describe("Decimals", () => {
    it("Should return the correct decimals for user representation", async () => {
      const { stakenet } = await loadFixture(deployFixture);
      expect(await stakenet.decimals()).to.be.equal(18);
    });
  });

  describe("Stake", () => {
    describe("Action", () => {
      it("Should correctly transfer tokens from account to stakenet's account", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(
          ethers.parseEther("90"),
        );
        expect(
          await limeSpark.balanceOf(await stakenet.getAddress()),
        ).to.be.equal(stake);
      });

      it("Should correctly mints StakedLimeStark upon stake in stakenet", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        expect(await stakenet.balanceOf(otherAccount)).to.be.equal(stake);
      });

      it("Should correctly set stake timestamp per user", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

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

        const stake = ethers.parseEther("20");

        await stakenet.connect(otherAccount).stake(stake);

        await expect(
          stakenet.connect(otherAccount).stake(stake),
        ).to.revertedWithCustomError(stakenet, "AccountHasAlreadyStaked");
      });

      it("Should revert if user stake more than userStakeLimit and contractStakeLimit", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stakeAboveUserLimit = ethers.parseEther("200");

        await expect(stakenet.connect(otherAccount).stake(stakeAboveUserLimit))
          .to.revertedWithCustomError(stakenet, "StakeTooHigh")
          .withArgs(ethers.parseEther("100"), ethers.parseEther("1000"));

        const stakeAboveContractLimit = ethers.parseEther("10000");

        await expect(
          stakenet.connect(otherAccount).stake(stakeAboveContractLimit),
        )
          .to.revertedWithCustomError(stakenet, "StakeTooHigh")
          .withArgs(ethers.parseEther("100"), ethers.parseEther("1000"));
      });

      it("Should revert if user stake less than userMinimumStake", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await expect(
          stakenet.connect(otherAccount).stake(2),
        ).to.revertedWithCustomError(stakenet, "StakeTooLow");
      });
    });

    describe("Events", () => {
      it("Should emit Staked event on staking tokens", async () => {
        const { stakenet, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await expect(stakenet.connect(otherAccount).stake(stake))
          .to.emit(stakenet, "Staked")
          .withArgs(otherAccount.address, stake);
      });
    });
  });

  describe("TransferPosition", () => {
    describe("Action", () => {
      it("Should transfer msg.sender's position to a given user", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.balanceOf(stakenetOwner)).to.be.equal(stake);
      });

      it("Should set the position of the user to be the sum of its current plus the new one", async () => {
        const { stakenet, limeSpark, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        const stakenetAddress = await stakenet.getAddress();

        await limeSpark
          .connect(stakenetOwner)
          .approve(stakenetAddress, ethers.parseEther("100"));

        await limeSpark.connect(otherAccount).mintInitial();
        await limeSpark
          .connect(otherAccount)
          .approve(stakenetAddress, ethers.parseEther("100"));

        await stakenet.connect(stakenetOwner).stake(ethers.parseEther("10"));

        await mine(10);

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));

        await mine(10);

        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.balanceOf(stakenetOwner)).to.be.equal(
          ethers.parseEther("20"),
        );
      });

      it("Should set the correct lock date of the new position of the receiver. Should be the max of the two positions", async () => {
        const { stakenet, limeSpark, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        const stakenetAddress = await stakenet.getAddress();

        await limeSpark
          .connect(stakenetOwner)
          .approve(stakenetAddress, ethers.parseEther("100"));

        await limeSpark.connect(otherAccount).mintInitial();
        await limeSpark
          .connect(otherAccount)
          .approve(stakenetAddress, ethers.parseEther("100"));

        await stakenet.connect(stakenetOwner).stake(ethers.parseEther("10"));

        await mine(10);

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));

        await mine(10);

        await stakenet.connect(otherAccount).transferPosition(stakenetOwner);

        expect(await stakenet.userStakedTimestamp(stakenetOwner)).to.be.equal(
          await stakenet.userStakedTimestamp(otherAccount),
        );
      });
    });

    describe("Validations", () => {
      it("Should revert when trying to transfer position but does not own one", async () => {
        const { stakenet, otherAccount } = await loadFixture(deployFixture);

        await expect(
          stakenet.transferPosition(otherAccount),
        ).to.revertedWithCustomError(stakenet, "AccountHasNotStaked");
      });
    });

    describe("Events", () => {
      it("Should emit PositionTransferred event on transfering position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        await expect(
          stakenet.connect(otherAccount).transferPosition(stakenetOwner),
        )
          .to.emit(stakenet, "PositionTransferred")
          .withArgs(otherAccount.address, stakenetOwner.address, stake);
      });
    });
  });

  describe("Withdraw", () => {
    describe("Action", () => {
      it("Should withdraw the tokens if transaction is after the lock date", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        expect(await limeSpark.balanceOf(stakenet.getAddress())).to.be.equal(
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));

        const stakedTokens = await stakenet.balanceOf(otherAccount);
        const yieldPercentage = await stakenet.yieldPercentage();
        const yieldDecimals = await stakenet.yieldDecimals();

        const accumulatedYield =
          (stakedTokens * yieldPercentage) /
          ethers.parseUnits("100", yieldDecimals);

        const oneDay = 86_000;

        await mine(2, { interval: oneDay });

        await stakenet.connect(otherAccount).withdraw();

        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(
          ethers.parseEther("100") + accumulatedYield,
        );
      });

      it("Should update rewards and contract stake limit while yield should stay the same", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        const oneDay = 86_000;
        await mine(2, { interval: oneDay });
        await stakenet.connect(otherAccount).withdraw();

        const rewardsLeft = await stakenet.rewards();
        const newContractLimit = await stakenet.contractStakeLimit();
        const yieldPercentage = await stakenet.yieldPercentage();

        expect(rewardsLeft).to.equal(ethers.parseEther("99"));
        expect(newContractLimit).to.equal(ethers.parseEther("990"));
        expect(yieldPercentage).to.equal(10_0000n);
      });

      it("Should update user limit if higher than the contract limit", async () => {
        const oneDayInSeconds = 86_000;

        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseEther("200"));

        await limeSpark.waitForDeployment();

        const Stakenet = await ethers.getContractFactory("Stakenet");
        const stakenet = await Stakenet.deploy(
          await limeSpark.getAddress(),
          oneDayInSeconds,
          ethers.parseEther("100"),
          ethers.parseUnits("333333", 15),
          ethers.parseEther("200"),
        );

        await stakenet.waitForDeployment();

        const [account1, account2, account3, account4] =
          await ethers.getSigners();

        await limeSpark.connect(account1).mintInitial();
        await limeSpark
          .connect(account1)
          .approve(await stakenet.getAddress(), ethers.parseEther("200"));

        await limeSpark.connect(account2).mintInitial();
        await limeSpark
          .connect(account2)
          .approve(await stakenet.getAddress(), ethers.parseEther("200"));

        await limeSpark.connect(account3).mintInitial();
        await limeSpark
          .connect(account3)
          .approve(await stakenet.getAddress(), ethers.parseEther("200"));

        await limeSpark.connect(account4).mintInitial();
        await limeSpark
          .connect(account4)
          .approve(await stakenet.getAddress(), ethers.parseEther("200"));

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(account2).stake(ethers.parseEther("200"));
        await stakenet.connect(account3).stake(ethers.parseEther("200"));

        await mine(2, { interval: oneDayInSeconds });

        await stakenet.connect(account2).withdraw();
        expect(await stakenet.rewards()).to.be.equal(
          ethers.parseUnits("40", 18),
        );
        expect(await stakenet.contractStakeLimit()).to.be.equal(
          "133333333333333333333",
        );
        expect(await stakenet.userStakeLimit()).to.be.equal(
          await stakenet.contractStakeLimit(),
        );
      });
    });

    describe("Validation", () => {
      it("Should revert if try to withdraw before lock date", async () => {
        const { stakenet, otherAccount, lockDuration } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));

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

    describe("Events", () => {
      it("Should emit StakeLimitsUpdated event on withdrawing tokens", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        const oneDay = 86_000;
        await mine(2, { interval: oneDay });

        await expect(stakenet.connect(otherAccount).withdraw())
          .to.emit(stakenet, "StakeLimitsUpdated")
          .withArgs(ethers.parseEther("990"), ethers.parseEther("100"));
      });

      it("Should emit Withdraw event on withdrawing tokens", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        const oneDay = 86_000;
        await mine(2, { interval: oneDay });

        await expect(stakenet.connect(otherAccount).withdraw())
          .to.emit(stakenet, "Withdrawn")
          .withArgs(otherAccount.address, ethers.parseEther("11"));
      });
    });
  });

  describe("YieldDecimals", () => {
    it("Should return the correct yield decimals", async () => {
      const { stakenet } = await loadFixture(deployFixture);

      expect(await stakenet.yieldDecimals()).to.be.equal(4);
    });
  });
});
