import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MockV3Aggregator } from "../../typechain";
import { Exchange } from "../../typechain/Exchange";
import { MockERC20 } from "../../typechain/MockERC20";

const params = {
  ethDecimals: 18,
  tokenDecimals: 6,
  pricefeedDecimals: 8,
  deposit: 1000, // usdc
  collateral: 1200, // eth
  ethUsdcValue: 3000,
  liquidationThreshold: 80,
};

const toWEI = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(amount.toString(), params.ethDecimals);
};

const toUSDC = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(amount.toString(), params.tokenDecimals);
};

const toETH = (amount: number | string | BigNumber) => {
  return ethers.utils.formatUnits(amount.toString(), params.ethDecimals);
};

const toPriceFeed = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(amount.toString(), params.pricefeedDecimals);
};

describe("Exchange", function () {
  let exchange: Exchange;
  let mockUSDC: MockERC20;
  let mockAggregator: MockV3Aggregator;
  let deployer: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;
  const lenderTokensAmt = toUSDC(params.deposit);

  beforeEach(async function () {
    [deployer, lender, borrower] = await ethers.getSigners();
    // Exchange
    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy();
    await exchange.deployed();
    // USDC
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockUSDC.deploy("USD Coin", "USD", params.tokenDecimals);
    await mockUSDC.deployed();
    // PriceFeeds
    const MockV3Aggregator = await ethers.getContractFactory(
      "MockV3Aggregator"
    );

    mockAggregator = await MockV3Aggregator.deploy(
      params.pricefeedDecimals,
      toPriceFeed(params.ethUsdcValue)
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
    mockUSDC.transfer(lender.address, lenderTokensAmt);
  });

  it("should initilize correctly", async function () {
    expect(await exchange.owner()).to.equal(deployer.address);
    expect(await exchange.s_lenderToken()).to.equal(mockUSDC.address);
    expect(await exchange.s_priceFeed()).to.equal(mockAggregator.address);
    expect(await mockUSDC.balanceOf(lender.address)).to.equal(lenderTokensAmt);
  });

  describe("Agreement being proposed", async () => {
    let agreementID: number;
    const args = {
      amount: lenderTokensAmt,
      duration: 1,
      rate: 50,
    };

    beforeEach(async () => {
      // Calls the propose() function
      await mockUSDC.connect(lender).approve(exchange.address, lenderTokensAmt);
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
        lenderTokensAmt.mul((1000 + args.rate) * args.duration).div(1000)
      );
    });

    it("Should emit a Propose event", async () => {
      const filter = exchange.filters.Propose(lender.address, agreementID);
      const event = await exchange.queryFilter(filter);
      expect(event[0].args.amount).to.equal(lenderTokensAmt);
    });

    describe("Agreement being activated", async () => {
      const collateralWEI = toWEI(params.collateral);

      this.beforeEach(async function () {
        // Activate an agreement
      });

      it("Should convert USDC to ETH correctly", async () => {
        const weiAmount = await exchange.getEthValueFromToken(lenderTokensAmt);
        expect(weiAmount).to.equal(
          toWEI(params.deposit).div(params.ethUsdcValue)
        );
      });

      const futureValue =
        params.deposit * (1 + args.rate / 1000) * args.duration;
      const calcReqCollateral = toWEI(
        ((200 - params.liquidationThreshold) * futureValue) /
          (params.ethUsdcValue * 100)
      );

      it("Should calculate minimum required collateral correctly", async () => {
        const minReqCollateral = await exchange.getMinReqCollateral(
          agreementID
        );
        expect(minReqCollateral).to.equal(calcReqCollateral);
      });

      it("Should activate the agreement correctly", async () => {
        await exchange
          .connect(borrower)
          .activate(agreementID, calcReqCollateral.add(1), {
            value: calcReqCollateral.add(1),
          });
        expect((await exchange.s_idToAgreement(agreementID)).status).to.equal(
          1
        );
        expect(await mockUSDC.balanceOf(borrower.address)).to.equal(
          lenderTokensAmt
        );
      });

      describe("Methods while agreement is in status = Active", async function () {
        it("Should let the borrower add more collateral", async () => {
          //...
        });
      });
    });
  });
});
