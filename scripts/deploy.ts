import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
import { writeFile } from "fs";
import { join } from "path";
import {
  LiquidatableExchange,
  MockERC20,
  MockSwapRouter,
  MockV3Aggregator,
  WETH9,
} from "../typechain";
import {
  deployContract,
  constants,
  toPriceFeed,
  aggregatorAddresses,
} from "../test/unit/utils";

async function main() {
  let liquidExchange: LiquidatableExchange;
  let mockUSDC: MockERC20;
  let mockWETH: WETH9;
  let mockAggregator: MockV3Aggregator;
  let mockSwapRouter: MockSwapRouter;
  let deployer: SignerWithAddress;
  let { tokenDecimals, pricefeedDecimals, ethUsdcValue } = constants;
  const aggregatorAddr = (aggregatorAddresses as any)[network.name];
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
  // Initialize
  await mockSwapRouter.setPriceFeed(mockAggregator!.address);
  await liquidExchange.setLenderToken(
    mockUSDC.address,
    mockAggregator!.address
  );
  await liquidExchange.setKeeperRegistryAddress(deployer.address);
  await liquidExchange.setSwapRouter(mockSwapRouter.address, mockWETH.address);

  const deployedAddresses = `Network name: ${
    network.name
  }\nDate: ${new Date().toLocaleString()}\nExchange address : ${
    liquidExchange.address
  }\nUSDC address : ${mockUSDC.address}\nAggregator address : ${
    mockAggregator!.address
  }\nMockSwapRouter address : ${mockSwapRouter.address}\nMockWeth address : ${
    mockWETH.address
  }\n\n`;
  console.log(deployedAddresses);

  //   add abis and addresses to ../data/
  writeFile(
    join(__dirname, "../data/deployedAddresses.txt"),
    deployedAddresses,
    { flag: "a+" },
    (err) => {
      if (err) console.error(err);
    }
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
