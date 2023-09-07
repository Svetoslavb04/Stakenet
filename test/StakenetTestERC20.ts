import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StakenetTestERC20", function () {
  async function deployFixture() {
    const StakenetTestERC20 =
      await ethers.getContractFactory("StakenetTestERC20");
    const stakenetTestERC20 = await StakenetTestERC20.deploy();

    const [owner, otherAccount] = await ethers.getSigners();

    return { stakenetTestERC20, owner, otherAccount };
  }

  describe("Transfer", () => {
    describe("Action", () => {
      it("Should transfer tokens", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);

        await stakenetTestERC20.transfer(otherAccount, 100);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(0);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(
          100,
        );
      });

      it("Should not transfer tokens if insufficient balance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);

        await stakenetTestERC20.transfer(otherAccount, 101);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(100);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(0);
      });

      it("Should not transfer tokens if receiver is address 0", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);

        await stakenetTestERC20.transfer(ethers.ZeroAddress, 101);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(100);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(0);
      });
    });
  });

  describe("TransferFrom", () => {
    describe("Action", () => {
      it("Should transfer tokens if spender has allowance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);
        await stakenetTestERC20.approve(otherAccount, 100);

        await stakenetTestERC20
          .connect(otherAccount)
          .transferFrom(owner, otherAccount, 100);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(0);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(
          100,
        );
      });

      it("Should transfer tokens if spender has infinite allowance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);
        await stakenetTestERC20.approve(otherAccount, ethers.MaxUint256);

        await stakenetTestERC20
          .connect(otherAccount)
          .transferFrom(owner, otherAccount, 100);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(0);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(
          100,
        );
      });

      it("Should not transfer tokens if insufficient balance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);
        await stakenetTestERC20.approve(otherAccount, 100);

        await stakenetTestERC20
          .connect(otherAccount)
          .transferFrom(owner, otherAccount, 101);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(100);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(0);
      });

      it("Should not transfer tokens if spender does not have enough allowance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);

        await stakenetTestERC20
          .connect(otherAccount)
          .transferFrom(owner, otherAccount, 101);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(100);
        expect(await stakenetTestERC20.balanceOf(otherAccount)).to.be.equal(0);
      });

      it("Should not transfer tokens if owner has insufficient balance", async () => {
        const { stakenetTestERC20, owner, otherAccount } =
          await loadFixture(deployFixture);

        await stakenetTestERC20.mint(100);
        await stakenetTestERC20.approve(otherAccount, 101);

        await stakenetTestERC20
          .connect(otherAccount)
          .transferFrom(owner, otherAccount, 101);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(100);
        expect(
          await stakenetTestERC20.balanceOf(ethers.ZeroAddress),
        ).to.be.equal(0);
      });

      it("Should not transfer tokens if spender is address(0)", async () => {
        const { stakenetTestERC20, owner } = await loadFixture(deployFixture);

        await stakenetTestERC20.transferFrom(ethers.ZeroAddress, owner, 0);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(0);
        expect(
          await stakenetTestERC20.balanceOf(ethers.ZeroAddress),
        ).to.be.equal(0);
      });

      it("Should not transfer tokens if receiver is address(0)", async () => {
        const { stakenetTestERC20, owner } = await loadFixture(deployFixture);

        await stakenetTestERC20.transferFrom(owner, ethers.ZeroAddress, 0);

        expect(await stakenetTestERC20.balanceOf(owner)).to.be.equal(0);
        expect(
          await stakenetTestERC20.balanceOf(ethers.ZeroAddress),
        ).to.be.equal(0);
      });
    });
  });
});
