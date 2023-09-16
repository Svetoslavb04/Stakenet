import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
  mine,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Stakenet", function () {
  async function deployFixture() {
    const oneDayInSeconds = 86_400;

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
    const oneDayInSeconds = 86_400;

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

      it("Should update user limit if higher than the contract limit", async () => {
        const oneDayInSeconds = 86_400;

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

      it("Should revert if no potential rewards left", async () => {
        const oneDayInSeconds = 86_400;

        const LimeSpark = await ethers.getContractFactory("LimeSpark");
        const limeSpark = await LimeSpark.deploy(ethers.parseEther("100"));

        await limeSpark.waitForDeployment();

        const Stakenet = await ethers.getContractFactory("Stakenet");
        const stakenet = await Stakenet.deploy(
          await limeSpark.getAddress(),
          oneDayInSeconds,
          ethers.parseEther("100"),
          ethers.parseEther("400"),
          ethers.parseEther("100"),
        );

        await stakenet.waitForDeployment();

        expect(await stakenet.yieldPercentage()).to.be.equal(25_0000);

        const [account1, account2, account3, account4, account5] =
          await ethers.getSigners();

        await limeSpark.connect(account1).mintInitial();
        await limeSpark
          .connect(account1)
          .approve(await stakenet.getAddress(), ethers.parseEther("100"));

        await limeSpark.connect(account2).mintInitial();
        await limeSpark
          .connect(account2)
          .approve(await stakenet.getAddress(), ethers.parseEther("100"));

        await limeSpark.connect(account3).mintInitial();
        await limeSpark
          .connect(account3)
          .approve(await stakenet.getAddress(), ethers.parseEther("100"));

        await limeSpark.connect(account4).mintInitial();
        await limeSpark
          .connect(account4)
          .approve(await stakenet.getAddress(), ethers.parseEther("100"));

        await limeSpark.connect(account5).mintInitial();
        await limeSpark
          .connect(account5)
          .approve(await stakenet.getAddress(), ethers.parseEther("100"));

        await stakenet.connect(account1).stake(ethers.parseEther("100"));
        await stakenet.connect(account2).stake(ethers.parseEther("100"));
        await stakenet.connect(account3).stake(ethers.parseEther("100"));
        await stakenet.connect(account4).stake(ethers.parseEther("100"));

        await expect(stakenet.connect(account5).stake(ethers.parseEther("100")))
          .to.be.reverted;
      });

      it("Should revert on failed ERC20 Transfer transaction", async () => {
        const oneDayInSeconds = 86_400;

        const StakenetTestERC20 =
          await ethers.getContractFactory("StakenetTestERC20");
        const stakenetTestERC20 = await StakenetTestERC20.deploy();

        await stakenetTestERC20.waitForDeployment();

        const Stakenet = await ethers.getContractFactory("Stakenet");
        const stakenet = await Stakenet.deploy(
          await stakenetTestERC20.getAddress(),
          oneDayInSeconds,
          100,
          100,
          100,
        );

        await stakenet.waitForDeployment();

        await stakenetTestERC20.mint(50);
        await stakenetTestERC20.approve(stakenet, 50);

        await expect(stakenet.stake(55)).to.be.revertedWithCustomError(
          stakenet,
          "ERC20TransferFailed",
        );
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

      it("Should emit StakeLimitsUpdated event on withdrawing tokens", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await expect(
          stakenet.connect(otherAccount).stake(ethers.parseEther("10")),
        )
          .to.emit(stakenet, "StakeLimitsUpdated")
          .withArgs(ethers.parseEther("990"), ethers.parseEther("100"));
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

        const oneDay = 86_400;

        await mine(2, { interval: oneDay });

        await stakenet.connect(otherAccount).withdraw();

        expect(await limeSpark.balanceOf(otherAccount)).to.be.equal(
          ethers.parseEther("100") + accumulatedYield,
        );

        expect(await stakenet.balanceOf(otherAccount)).to.be.equal(0);
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
        const oneDay = 86_400;
        await mine(2, { interval: oneDay });
        await stakenet.connect(otherAccount).withdraw();

        const rewardsLeft = await stakenet.rewards();
        const newContractLimit = await stakenet.contractStakeLimit();
        const yieldPercentage = await stakenet.yieldPercentage();

        expect(rewardsLeft).to.equal(ethers.parseEther("99"));
        expect(newContractLimit).to.equal(ethers.parseEther("990"));
        expect(yieldPercentage).to.equal(10_0000n);
      });

      it("Should withdraw a received position", async () => {
        const { stakenet, limeSpark, stakenetOwner, otherAccount } =
          await loadFixture(deployFixtureWithStakenetApproval);

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner.address, ethers.parseEther("10"));

        const stakedTokens = await stakenet.balanceOf(stakenetOwner.address);
        const yieldPercentage = await stakenet.yieldPercentage();
        const yieldDecimals = await stakenet.yieldDecimals();

        const accumulatedYield =
          (stakedTokens * yieldPercentage) /
          ethers.parseUnits("100", yieldDecimals);

        const oneDay = 86_400;

        await mine(2, { interval: oneDay });

        await stakenet.connect(stakenetOwner).withdraw();

        expect(await limeSpark.balanceOf(stakenetOwner.address)).to.be.equal(
          ethers.parseEther("10") + accumulatedYield,
        );

        expect(await stakenet.balanceOf(stakenetOwner.address)).to.be.equal(0);
      });

      it("Should withdraw more than one received positions", async () => {
        const { stakenet, limeSpark } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const [stakenetOwner, otherAccount, otherAccount2] =
          await ethers.getSigners();

        await limeSpark.connect(otherAccount2).mintInitial();
        await limeSpark
          .connect(otherAccount2)
          .approve(await stakenet.getAddress(), ethers.parseEther("20"));

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        await stakenet.connect(otherAccount2).stake(ethers.parseEther("20"));

        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner.address, ethers.parseEther("10"));

        await stakenet
          .connect(otherAccount2)
          .transfer(stakenetOwner.address, ethers.parseEther("20"));

        const stakedTokens = await stakenet.balanceOf(stakenetOwner.address);

        expect(stakedTokens).to.be.equal(ethers.parseEther("30"));

        const yieldPercentage = await stakenet.yieldPercentage();
        const yieldDecimals = await stakenet.yieldDecimals();

        const accumulatedYield =
          (stakedTokens * yieldPercentage) /
          ethers.parseUnits("100", yieldDecimals);

        const oneDay = 86_400;

        await mine(2, { interval: oneDay });

        await stakenet.connect(stakenetOwner).withdraw();

        expect(await limeSpark.balanceOf(stakenetOwner.address)).to.be.equal(
          stakedTokens + accumulatedYield,
        );

        expect(await stakenet.balanceOf(stakenetOwner.address)).to.be.equal(0);
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
        ).to.revertedWithCustomError(stakenet, "AccountDoesNotOwnAPosition");
      });

      it("Should revert on failed ERC20 Transaction", async () => {
        const oneDayInSeconds = 86_400;

        const StakenetTestERC20 =
          await ethers.getContractFactory("StakenetTestERC20");
        const stakenetTestERC20 = await StakenetTestERC20.deploy();

        await stakenetTestERC20.waitForDeployment();

        const Stakenet = await ethers.getContractFactory("Stakenet");
        const stakenet = await Stakenet.deploy(
          await stakenetTestERC20.getAddress(),
          oneDayInSeconds,
          100,
          100,
          100,
        );

        await stakenet.waitForDeployment();

        await stakenetTestERC20.mint(100);
        await stakenetTestERC20.approve(stakenet, 100);

        await stakenet.stake(100);

        await mine(2, { interval: oneDayInSeconds });

        const [owner] = await ethers.getSigners();

        stakenetTestERC20.connect(stakenet.runner).transfer(owner, 100);

        await expect(stakenet.withdraw()).to.revertedWithCustomError(
          stakenet,
          "ERC20TransferFailed",
        );
      });
    });

    describe("Events", () => {
      it("Should emit Withdraw event on withdrawing tokens", async () => {
        const { stakenet, limeSpark, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await limeSpark.transfer(
          await stakenet.getAddress(),
          ethers.parseEther("100"),
        );

        await stakenet.connect(otherAccount).stake(ethers.parseEther("10"));
        const oneDay = 86_400;
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

  describe("Transfer", () => {
    describe("Action", () => {
      it("Should transfer msg.sender's position to a given user", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner, await stakenet.balanceOf(otherAccount));

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

        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner, await stakenet.balanceOf(otherAccount));

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

        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner, await stakenet.balanceOf(otherAccount));

        expect(await stakenet.userStakedTimestamp(stakenetOwner)).to.be.equal(
          await stakenet.userStakedTimestamp(otherAccount),
        );
      });

      it("Should transfer a received position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const positionAmount = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(positionAmount);
        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner.address, positionAmount);

        expect(await stakenet.balanceOf(stakenetOwner.address)).to.be.equal(
          positionAmount,
        );

        await stakenet.transfer(otherAccount, positionAmount);

        expect(await stakenet.balanceOf(otherAccount.address)).to.be.equal(
          positionAmount,
        );

        expect(await stakenet.balanceOf(stakenetOwner.address)).to.be.equal(0);
      });
    });

    describe("Validations", () => {
      it("Should revert when trying to transfer position but does not own one", async () => {
        const { stakenet, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        await expect(
          stakenet.transfer(
            otherAccount,
            await stakenet.balanceOf(stakenetOwner),
          ),
        ).to.revertedWithCustomError(stakenet, "AccountDoesNotOwnAPosition");
      });

      it("Should revert when trying to transfer less than the position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        const balance = await stakenet.balanceOf(otherAccount);

        await expect(
          stakenet.connect(otherAccount).transfer(stakenetOwner, balance - 10n),
        )
          .to.revertedWithCustomError(stakenet, "AmountLessThanPosition")
          .withArgs(balance - 10n, balance);
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
          stakenet.connect(otherAccount).transfer(stakenetOwner, stake),
        )
          .to.emit(stakenet, "Transfer")
          .withArgs(otherAccount.address, stakenetOwner.address, stake);
      });
    });
  });

  describe("TransferFrom", () => {
    describe("Action", () => {
      it("Should transfer _froms's position to _to", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet.connect(otherAccount).approve(stakenetOwner, stake);

        await stakenet.transferFrom(otherAccount, stakenetOwner, stake);

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

        await stakenet
          .connect(otherAccount)
          .approve(stakenetOwner, ethers.parseEther("10"));

        await stakenet.transferFrom(
          otherAccount,
          stakenetOwner,
          await stakenet.balanceOf(otherAccount),
        );

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

        await stakenet
          .connect(otherAccount)
          .approve(stakenetOwner, ethers.parseEther("10"));

        await stakenet.transferFrom(
          otherAccount,
          stakenetOwner,
          await stakenet.balanceOf(otherAccount),
        );

        expect(await stakenet.userStakedTimestamp(stakenetOwner)).to.be.equal(
          await stakenet.userStakedTimestamp(otherAccount),
        );
      });

      it("Should transfer _froms's position to _to", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet.connect(otherAccount).transfer(stakenetOwner, stake);

        await stakenet.approve(otherAccount, stake);

        await stakenet
          .connect(otherAccount)
          .transferFrom(stakenetOwner, otherAccount, stake);

        expect(await stakenet.balanceOf(otherAccount.address)).to.be.equal(
          stake,
        );
      });
    });

    describe("Validations", () => {
      it("Should revert when trying to transfer position but does not own one", async () => {
        const { stakenet, stakenetOwner, otherAccount } =
          await loadFixture(deployFixture);

        await expect(
          stakenet.transferFrom(
            otherAccount,
            stakenetOwner,
            ethers.parseEther("10"),
          ),
        ).to.revertedWithCustomError(stakenet, "AccountDoesNotOwnAPosition");
      });

      it("Should revert when trying to transfer less than the position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        const balance = await stakenet.balanceOf(otherAccount);

        await stakenet.connect(otherAccount).approve(stakenetOwner, stake);

        await expect(
          stakenet.transferFrom(otherAccount, stakenetOwner, stake - 10n),
        )
          .to.revertedWithCustomError(stakenet, "AmountLessThanPosition")
          .withArgs(balance - 10n, balance);
      });
    });

    describe("Events", () => {
      it("Should emit PositionTransferred event on transfering position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet.connect(otherAccount).approve(stakenetOwner, stake);

        await expect(stakenet.transferFrom(otherAccount, stakenetOwner, stake))
          .to.emit(stakenet, "Transfer")
          .withArgs(otherAccount.address, stakenetOwner.address, stake);
      });
    });
  });

  describe("Approve", () => {
    describe("Action", () => {
      it("Should set the allowance for given spender to be equal to the position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        await stakenet.connect(otherAccount).approve(stakenetOwner, stake);

        expect(
          await stakenet.allowance(otherAccount, stakenetOwner),
        ).to.be.equal(stake);
      });

      it("Should set the allowance for given spender to be equal to the received position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);
        await stakenet
          .connect(otherAccount)
          .transfer(stakenetOwner.address, stake);

        await stakenet.approve(otherAccount, stake);

        expect(
          await stakenet.allowance(stakenetOwner, otherAccount),
        ).to.be.equal(stake);
      });
    });

    describe("Validations", () => {
      it("Should revert if user gives approval but has not staked", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        await expect(
          stakenet
            .connect(otherAccount)
            .approve(stakenetOwner, ethers.parseEther("10")),
        ).to.revertedWithCustomError(stakenet, "AccountDoesNotOwnAPosition");
      });

      it("Should revert if user gives approval with different amount from position", async () => {
        const { stakenet, stakenetOwner, otherAccount } = await loadFixture(
          deployFixtureWithStakenetApproval,
        );

        const stake = ethers.parseEther("10");

        await stakenet.connect(otherAccount).stake(stake);

        await expect(
          stakenet.connect(otherAccount).approve(stakenetOwner, stake - 10n),
        )
          .to.revertedWithCustomError(stakenet, "AmountLessThanPosition")
          .withArgs(stake - 10n, stake);
      });
    });
  });
});
