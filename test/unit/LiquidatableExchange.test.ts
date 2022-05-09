import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  LiquidatableExchange,
  MockERC20,
  MockV3Aggregator,
} from "../../typechain";
import {
  deployContract,
  constants,
  activateAgreement,
  toWEI,
  toPriceFeed,
  args,
  toUSDC,
  proposeAgreement,
  repayEntireLoan,
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

  //   KEEPERS
  describe("Chainlink Keepers Functionality", async function () {
    let agreementID: number;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, liquidExchange);
      await activateAgreement(liquidExchange, borrower, agreementID);
    });

    it("Should return ids to liquidate if collateral value isn't enough", async () => {
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

    it("Should return ids to liquidate if not repaid by expiration date", async () => {
      const { secsPerYear } = constants;
      const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
      await network.provider.send("evm_increaseTime", [secsPerYear + 1]);
      await network.provider.send("evm_mine");
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
