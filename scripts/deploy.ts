import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, waffle } from "hardhat";
import {
  LiquidatableExchange,
  MockERC20,
  MockSwapRouter,
  MockV3Aggregator,
  WETH9,
} from "../typechain";
import { deployContract, constants, toPriceFeed } from "../test/unit/utils";

async function main() {
  let liquidExchange: LiquidatableExchange;
  let mockUSDC: MockERC20;
  let mockWETH: WETH9;
  let mockAggregator: MockV3Aggregator;
  let mockSwapRouter: MockSwapRouter;
  let deployer: SignerWithAddress;
  let { tokenDecimals, pricefeedDecimals, ethUsdcValue } = constants;
  [deployer] = await ethers.getSigners();

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
  // SwapRouter
  mockSwapRouter = (await deployContract(
    "MockSwapRouter",
    deployer
  )) as MockSwapRouter;
  // Init
  await mockSwapRouter.setPriceFeed(mockAggregator!.address);
  await liquidExchange.setLenderToken(
    mockUSDC.address,
    mockAggregator!.address
  );
  await liquidExchange.setKeeperRegistryAddress(deployer.address);
  await liquidExchange.setSwapRouter(mockSwapRouter.address, mockWETH.address);

  console.log(
    "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\nMockSwapRouter address : %s\nMockWeth address : %s\n",
    liquidExchange.address,
    mockUSDC.address,
    mockAggregator!.address,
    mockSwapRouter.address,
    mockWETH.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
