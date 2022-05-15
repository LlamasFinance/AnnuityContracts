import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import {
  LiquidatableExchange,
  MockERC20,
  MockSwapRouter,
  MockV3Aggregator,
  WETH9,
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
  aggregatorAddresses,
} from "./utils";

describe("LiquidatableExchange", async function () {
  let liquidExchange: LiquidatableExchange;
  let mockUSDC: MockERC20;
  let mockWETH: WETH9;
  let mockAggregator: MockV3Aggregator;
  let mockSwapRouter: MockSwapRouter;
  let deployer: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;

  //   SETUP
  this.beforeEach(async function () {
    let { tokenDecimals, pricefeedDecimals, ethUsdcValue } = constants;
    const aggregatorAddr = (aggregatorAddresses as any)[network.name];
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
    // WEI
    mockWETH = (await deployContract("WETH9", deployer)) as WETH9;
    // Aggregator
    if (!aggregatorAddr) {
      mockAggregator = (await deployContract("MockV3Aggregator", deployer, [
        pricefeedDecimals,
        toPriceFeed(ethUsdcValue),
      ])) as MockV3Aggregator;
    } else {
      mockAggregator = await ethers.getContractAt(
        "MockV3Aggregator",
        aggregatorAddr
      );
    }
    // SwapRouter
    mockSwapRouter = (await deployContract(
      "MockSwapRouter",
      deployer
    )) as MockSwapRouter;
    // Init
    await mockSwapRouter.setPriceFeed(mockAggregator.address);
    await liquidExchange.setLenderToken(
      mockUSDC.address,
      mockAggregator.address
    );
    await liquidExchange.setKeeperRegistryAddress(deployer.address);
    await liquidExchange.setSwapRouter(
      mockSwapRouter.address,
      mockWETH.address
    );
  });

  it("should initilize correctly", async function () {
    expect(await liquidExchange.owner()).to.equal(deployer.address);
    expect(await liquidExchange.s_lenderToken()).to.equal(mockUSDC.address);
    expect(await liquidExchange.s_priceFeed()).to.equal(mockAggregator.address);
    console.log(
      "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\nMockSwapRouter address : %s\nMockWeth address : %s\n",
      liquidExchange.address,
      mockUSDC.address,
      mockAggregator.address,
      mockSwapRouter.address,
      mockWETH.address
    );
  });

  //   UNISWAP
  describe("Uniswap Functionality", async function () {
    it("Should swap eth for usdc", async () => {
      const { ethUsdcValue } = constants;
      const weiIn = toWEI(1);
      const desiredUsdcOut = toUSDC(ethUsdcValue / 2);

      const params = {
        tokenIn: mockWETH.address,
        tokenOut: mockUSDC.address,
        fee: 0,
        recipient: lender.address,
        deadline: 0,
        amountOut: desiredUsdcOut,
        amountInMaximum: weiIn,
        sqrtPriceLimitX96: 0,
      };

      const usdcBalanceBefore = await mockUSDC.balanceOf(lender.address);
      await mockSwapRouter
        .connect(lender)
        .exactOutputSingle(params, { value: weiIn });
      const usdcBalanceAfter = await mockUSDC.balanceOf(lender.address);
      expect(usdcBalanceAfter.sub(usdcBalanceBefore)).to.equal(desiredUsdcOut);
    });
  });

  //   KEEPERS
  describe("Chainlink Keepers Functionality", async function () {
    let agreementID: number;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, liquidExchange);
      await activateAgreement(liquidExchange, borrower, agreementID);
    });

    it("Should return ids to liquidate if collateral value isn't enough", async () => {
      const { upkeepNeeded, performData } =
        await liquidateBecauseOfCollateral();
      const returnedIds = ethers.utils.defaultAbiCoder.decode(
        ["uint[]"],
        performData
      )[0];
      expect(upkeepNeeded).to.equal(true);
      expect(returnedIds[0]).to.equal(agreementID);
    });

    it("Should return ids to liquidate if not repaid by expiration date", async () => {
      const { upkeepNeeded, performData } = await liquidateBecauseOfTime();
      const returnedIds = ethers.utils.defaultAbiCoder.decode(
        ["uint[]"],
        performData
      )[0];
      expect(upkeepNeeded).to.equal(true);
      expect(returnedIds[0]).to.equal(agreementID);
    });
  });

  //   KEEPERS + UNISWAP
  describe("Keepers + Uniswap functionality combined", async function () {
    let agreementID: number;

    this.beforeEach(async () => {
      agreementID = await proposeAgreement(mockUSDC, lender, liquidExchange);
      await activateAgreement(liquidExchange, borrower, agreementID);
    });

    it("Should fully liquidate an agreement if collateral value isn't enough", async () => {
      const { upkeepNeeded, performData } =
        await liquidateBecauseOfCollateral();
      expect(upkeepNeeded).to.equal(true);
      await liquidExchange.performUpkeep(performData);
      const agreement = await liquidExchange.s_idToAgreement(agreementID);

      // Status (enum) should be Repaid
      expect(agreement.status).to.equal(2);

      // Any leftover eth from the liquidation should show in the agreement's collateral balance
      const collateralBorrowerGetsRefunded = agreement.collateral;
      const contractEthBalance = await waffle.provider.getBalance(
        liquidExchange.address
      );

      //   The collateral amount should show more eth than the contract actually has
      expect(collateralBorrowerGetsRefunded).to.equal(contractEthBalance);
    });

    it("Should liquidate an agreement if the duration has passed", async () => {
      const { upkeepNeeded, performData } = await liquidateBecauseOfTime();
      expect(upkeepNeeded).to.equal(true);

      await liquidExchange.performUpkeep(performData);
      const agreement = await liquidExchange.s_idToAgreement(agreementID);

      expect(agreement.status).to.equal(2);

      const collateralBorrowerGetsRefunded = agreement.collateral;
      const contractEthBalance = await waffle.provider.getBalance(
        liquidExchange.address
      );

      expect(collateralBorrowerGetsRefunded).to.equal(contractEthBalance);
    });
  });

  //   SHARED HELPER FUNCTIONS
  const liquidateBecauseOfCollateral = async () => {
    const { ethUsdcValue } = constants;
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    // since collateral is at the minRequired, subtraction 2 from the value of it will trigger liquidation
    await mockAggregator.updateAnswer(toPriceFeed(ethUsdcValue - 2));
    const { upkeepNeeded, performData } =
      await liquidExchange.callStatic.checkUpkeep(checkData);
    return { upkeepNeeded, performData };
  };

  const liquidateBecauseOfTime = async () => {
    const { secsPerYear } = constants;
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    await network.provider.send("evm_increaseTime", [secsPerYear + 1]);
    await network.provider.send("evm_mine");
    const { upkeepNeeded, performData } =
      await liquidExchange.callStatic.checkUpkeep(checkData);
    return { upkeepNeeded, performData };
  };
});
