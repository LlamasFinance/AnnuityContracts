import { isBigNumberish } from "@ethersproject/bignumber/lib/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { Exchange, MockERC20, MockV3Aggregator } from "../../typechain";
import { LiquidatableExchange } from "../../typechain/LiquidatableExchange";
import {
  deployContract,
  constants,
  activateAgreement,
  toWEI,
  toPriceFeed,
  args,
  toUSDC,
  proposeAgreement,
} from "./utils";

describe("LiquidatableExchange", async function () {
  let liquidExchange: LiquidatableExchange;
  let mockUSDC: MockERC20;
  let mockAggregator: MockV3Aggregator;
  let deployer: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;

  //   SETUP
  this.beforeEach(async function () {
    let { tokenDecimals, pricefeedDecimals, ethUsdcValue } = constants;
    [deployer, lender, borrower] = await ethers.getSigners();
    // Exchange
    liquidExchange = (await deployContract(
      "LiquidatableExchange",
      deployer
    )) as LiquidatableExchange;
    // USDC
    mockUSDC = (await deployContract("MockERC20", deployer, [
      "USD Coin",
      "USDC",
      tokenDecimals,
    ])) as MockERC20;
    // Aggregator
    mockAggregator = (await deployContract("MockV3Aggregator", deployer, [
      pricefeedDecimals,
      toPriceFeed(ethUsdcValue),
    ])) as MockV3Aggregator;
    // Init
    liquidExchange.setLenderToken(mockUSDC.address, mockAggregator.address);
    liquidExchange.setKeeperRegistryAddress(deployer.address);
  });

  it("should initilize correctly", async function () {
    expect(await liquidExchange.owner()).to.equal(deployer.address);
    expect(await liquidExchange.s_lenderToken()).to.equal(mockUSDC.address);
    expect(await liquidExchange.s_priceFeed()).to.equal(mockAggregator.address);
    console.log(
      "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\n",
      liquidExchange.address,
      mockUSDC.address,
      mockAggregator.address
    );
  });

  //   LIQUIDATIONS
  describe("Liquidating Contracts", async function () {
    let agreementID: number;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, liquidExchange);
      await activateAgreement(liquidExchange, borrower, agreementID);
    });

    it("Should liquidate", async () => {
      const { ethUsdcValue } = constants;
      const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
      await mockAggregator.updateAnswer(ethUsdcValue / 2);
      const { upkeepNeeded, performData } =
        await liquidExchange.callStatic.checkUpkeep(checkData);
      const returnedIds = ethers.utils.defaultAbiCoder.decode(
        ["uint[]"],
        performData
      )[0];
      expect(upkeepNeeded).to.equal(true);
      expect(returnedIds[0]).to.equal(agreementID);
    });
  });
});
