import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockV3Aggregator } from "../../typechain";
import { Exchange } from "../../typechain/Exchange";
import { MockERC20 } from "../../typechain/MockERC20";

describe("Exchange", function () {
  let exchange: Exchange;
  let mockUSDC: MockERC20;
  let mockAggregator: MockV3Aggregator;
  let deployer: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;
  const lenderTokensAmt = 1000;

  beforeEach(async function () {
    [deployer, lender, borrower] = await ethers.getSigners();
    // Exchange
    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy();
    await exchange.deployed();
    // USDC
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockUSDC.deploy("USD Coin", "USD");
    await mockUSDC.deployed();
    // PriceFeeds
    const MockV3Aggregator = await ethers.getContractFactory(
      "MockV3Aggregator"
    );
    const args = {
      decimals: 8,
      initialAnswer: "300000000000", // 3000.00000000 usdc/eth
    };
    mockAggregator = await MockV3Aggregator.deploy(
      args.decimals,
      args.initialAnswer
    );
    await mockAggregator.deployed();
    console.log(
      "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\n",
      exchange.address,
      mockUSDC.address,
      mockAggregator.address
    );
    // Initialize
    exchange.setLenderToken(mockUSDC.address, mockAggregator.address);
    mockUSDC.transfer(lender.address, toWEI(lenderTokensAmt));
  });

  it("should initilize correctly", async function () {
    expect(await exchange.owner()).to.equal(deployer.address);
    expect(await exchange.s_lenderToken()).to.equal(mockUSDC.address);
    expect(await exchange.s_priceFeed()).to.equal(mockAggregator.address);
    expect(await mockUSDC.balanceOf(lender.address)).to.equal(
      toWEI(lenderTokensAmt)
    );
  });

  describe("Agreement being proposed", async () => {
    let agreementID: number;
    const args = {
      amount: lenderTokensAmt,
      duration: 1,
      rate: 5,
    };

    beforeEach(async () => {
      // Calls the propose() function
      await mockUSDC
        .connect(lender)
        .approve(exchange.address, toWEI(lenderTokensAmt));
      const tx = await exchange
        .connect(lender)
        .propose(args.amount, args.duration, args.rate);
      const receipt = await tx.wait();
      agreementID = receipt.events?.filter((x) => {
        return x.event == "Propose";
      })[0].args?.id;
    });

    it("Should have the correct id", async () => {
      expect(agreementID).to.equal(1);
    });

    it("Should store a new and correct agreement", async () => {
      const agreement = await exchange.s_idToAgreement(agreementID);
      expect(agreement.lender).to.equal(lender.address);
      expect(agreement.futureValue).to.equal(
        lenderTokensAmt * (1 + args.rate / 100) * args.duration
      );
    });

    it("Should emit a Propose event", async () => {
      const filter = exchange.filters.Propose(lender.address, agreementID);
      const event = await exchange.queryFilter(filter);
      expect(event[0].args.amount).to.equal(lenderTokensAmt);
    });
  });
});

const toWEI = (amount: number | string) => {
  return ethers.utils.parseUnits(amount.toString(), 18);
};
