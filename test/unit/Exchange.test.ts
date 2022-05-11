import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Exchange, MockERC20, MockV3Aggregator } from "../../typechain";
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

// Interactions
describe("Exchange", function () {
  let exchange: Exchange;
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
    exchange = (await deployContract("Exchange", deployer)) as Exchange;
    // USDC
    mockUSDC = (await deployContract("MockERC20", deployer, [
      "USD Coin",
      "USDC",
      tokenDecimals,
    ])) as MockERC20;
    // Aggregator
    if (network.name == "hardhat") {
      mockAggregator = (await deployContract("MockV3Aggregator", deployer, [
        pricefeedDecimals,
        toPriceFeed(ethUsdcValue),
      ])) as MockV3Aggregator;
    } else if (network.name == "kovan") {
      mockAggregator = await ethers.getContractAt(
        "MockV3Aggregator",
        "0x64EaC61A2DFda2c3Fa04eED49AA33D021AeC8838"
      );
    }
    // Init
    exchange.setLenderToken(mockUSDC.address, mockAggregator.address);
  });

  it("should initilize correctly", async function () {
    expect(await exchange.owner()).to.equal(deployer.address);
    expect(await exchange.s_lenderToken()).to.equal(mockUSDC.address);
    expect(await exchange.s_priceFeed()).to.equal(mockAggregator.address);
    console.log(
      "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\n",
      exchange.address,
      mockUSDC.address,
      mockAggregator.address
    );
  });

  //   PROPOSE AGREEMENT
  describe("Agreement being proposed", async () => {
    let { lenderTokens, duration, rate, agreementID } = args;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, exchange);
    });

    it("Should have the correct id", async () => {
      expect(agreementID).to.equal(1);
    });

    it("Should store a new and correct agreement", async () => {
      const agreement = await exchange.s_idToAgreement(agreementID!);
      expect(agreement.lender).to.equal(lender.address);
      // ((1000+50)*1)/1000 = 1050
      expect(agreement.futureValue).to.equal(
        lenderTokens!.mul((1000 + rate!) * duration!).div(1000)
      );
    });

    it("Should emit a Propose event", async () => {
      const filter = exchange.filters.Propose(lender.address, agreementID);
      const event = await exchange.queryFilter(filter);
      expect(event[0].args.amount).to.equal(lenderTokens);
    });
  });

  // ACTIVATE AGREEMENT
  describe("Agreement being activated", async () => {
    let { lenderTokens, collateral, deposit, agreementID } = args;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, exchange);
      await activateAgreement(exchange, borrower, agreementID!);
    });

    it("Should activate the agreement correctly", async () => {
      expect((await exchange.s_idToAgreement(agreementID!)).status).to.equal(1);
    });

    it("Should convert USDC to ETH correctly", async () => {
      const weiAmount = await exchange.getEthValueFromToken(lenderTokens!);
      expect(weiAmount).to.equal(toWEI(deposit!).div(constants.ethUsdcValue));
    });

    it("Should calculate minimum required collateral correctly", async () => {
      const minReqCollateral = await exchange.getMinReqCollateral(agreementID!);
      expect(minReqCollateral).to.equal(toWEI(collateral!));
    });
  });

  //   AGREEMENT STATUS = ACTIVE
  describe("Methods while agreement is in status = Active", async function () {
    let { collateralTokens, addedCollateralTokens, futureValue, agreementID } =
      args;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, exchange);
      await activateAgreement(exchange, borrower, agreementID!);
      await mockUSDC.transfer(borrower.address, toUSDC(futureValue!));
    });

    it("Should let the borrower add more collateral", async () => {
      await exchange
        .connect(borrower)
        .addCollateral(agreementID!, addedCollateralTokens!, {
          value: addedCollateralTokens!,
        });
      expect(
        (await exchange.s_idToAgreement(agreementID!)).collateral
      ).to.equal(collateralTokens!.add(addedCollateralTokens!));
    });

    it("Should let the borrower withdraw some collateral", async () => {
      const amount = toWEI(100);
      await exchange
        .connect(borrower)
        .addCollateral(agreementID!, amount, { value: amount });
      await exchange.connect(borrower).withdrawCollateral(agreementID!, amount);

      const filter = exchange.filters.WithdrawCollateral(
        borrower.address,
        agreementID!
      );
      const event = await exchange.queryFilter(filter);
      expect(event[0].args.amount).to.equal(amount);
    });

    it("Should let the borrower repay part of the loan", async () => {
      let amount = toUSDC(futureValue!).div(2);
      await mockUSDC.connect(borrower).approve(exchange.address, amount);
      await exchange.connect(borrower).repay(agreementID!, amount);
      expect((await exchange.s_idToAgreement(agreementID!)).repaidAmt).to.equal(
        amount
      );
    });

    it("Should let the borrower repay all of the loan", async () => {
      await repayEntireLoan(mockUSDC, borrower, exchange, agreementID!);
      const agreement = await exchange.s_idToAgreement(agreementID!);
      expect(agreement.repaidAmt).to.equal(toUSDC(futureValue!));
      expect(agreement.status).to.equal(2);
    });
  });

  // AGREEMENT STATUS = REPAID
  describe("Methods while agreement status = Repaid", async () => {
    let { futureValue, agreementID } = args;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, exchange);
      await activateAgreement(exchange, borrower, agreementID!);
      await repayEntireLoan(mockUSDC, borrower, exchange, agreementID!);
    });

    it("Should let the lender withdraw the future value", async () => {
      let lenderBalance1 = await mockUSDC.balanceOf(lender.address);
      await exchange.connect(lender).close(agreementID!);
      let lenderBalance2 = await mockUSDC.balanceOf(lender.address);
      expect(lenderBalance2.sub(lenderBalance1)).equals(toUSDC(futureValue!));
    });
  });
});
