import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Contract", function () {
  async function deployFixture() {
    
    const [owner, otherAccount] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("Contract");
    const contract = await Contract.deploy();

    return { contract };
  }
});
