import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { MockERC20, MockV3Aggregator } from "../../typechain";
import { LiquidatableExchange } from "../../typechain/LiquidatableExchange";
import { Exchange } from "../../typechain/Exchange";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// Deploy Functions
export const deployContract = async (
  name: string,
  deployer: SignerWithAddress,
  args?: any
) => {
  const Contract = await ethers.getContractFactory(name);
  let contract;
  contract = args
    ? await Contract.connect(deployer).deploy(...args)
    : await Contract.deploy();
  await contract.deployed();
  return contract;
};

// CONSTANTS
export const constants = {
  ethDecimals: 18,
  tokenDecimals: 6,
  pricefeedDecimals: 8,
  ethUsdcValue: 3000,
  liquidationThreshold: 80,
};

// UTILS
export const toTokenBits = (
  amount: number | string | BigNumber,
  decimals: number
) => {
  return ethers.utils.parseUnits(amount.toString(), decimals);
};

export const toToken = (
  amount: number | string | BigNumber,
  decimals: number
) => {
  return ethers.utils.formatUnits(amount.toString(), decimals);
};

export const toWEI = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(amount.toString(), constants.ethDecimals);
};

export const toUSDC = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(amount.toString(), constants.tokenDecimals);
};

export const toETH = (amount: number | string | BigNumber) => {
  return ethers.utils.formatUnits(amount.toString(), constants.ethDecimals);
};

export const toPriceFeed = (amount: number | string | BigNumber) => {
  return ethers.utils.parseUnits(
    amount.toString(),
    constants.pricefeedDecimals
  );
};

export const calcFutureValue = (
  deposit: number,
  rate: number,
  duration: number
): number => {
  return deposit * (1 + rate / 1000) * duration;
};

export const calcReqCollateral = (futureValue: number): number => {
  const { liquidationThreshold, ethUsdcValue } = constants;
  // ((200-80)*$1000)/$3000/ETH = (1200/3000) ETH
  return ((200 - liquidationThreshold) * futureValue) / (ethUsdcValue * 100);
};

// ARGUMENTS
export interface agreementArgs {
  agreementID?: number;
  deposit?: number;
  lenderTokens?: BigNumber;
  duration?: number;
  rate?: number;
  futureValue?: number;
  collateral?: number;
  collateralTokens?: BigNumber;
  addedCollateralTokens?: BigNumber;
}
export let args: agreementArgs = {};
args = {
  deposit: 1000,
  lenderTokens: toUSDC(1000),
  duration: 1,
  rate: 50,
};
args.futureValue = calcFutureValue(args.deposit!, args.rate!, args.duration!);
args.collateral = calcReqCollateral(args.futureValue!);
args.collateralTokens = toWEI(args.collateral!).add(1);
args.addedCollateralTokens = toWEI(1);

// Contract Interactions
export type MyExchange = Exchange | LiquidatableExchange;

export const proposeAgreement = async (
  mockUSDC: MockERC20,
  lender: SignerWithAddress,
  exchange: MyExchange
) => {
  const { lenderTokens, duration, rate } = args;
  await mockUSDC.transfer(lender.address, lenderTokens!);
  console.log(await mockUSDC.balanceOf(lender.address));
  await mockUSDC.connect(lender).approve(exchange.address, lenderTokens!);
  const tx = await exchange
    .connect(lender)
    .propose(lenderTokens!, duration!, rate!);
  const receipt = await tx.wait();
  const agreementID = receipt.events?.filter((x) => {
    return x.event == "Propose";
  })[0].args?.id;
  return agreementID;
};

export const activateAgreement = async (
  exchange: MyExchange,
  borrower: SignerWithAddress,
  agreementID: number
) => {
  const { collateralTokens } = args;
  await exchange.connect(borrower).activate(agreementID, collateralTokens!, {
    value: collateralTokens!,
  });
};

export const repayEntireLoan = async (
  mockUSDC: MockERC20,
  borrower: SignerWithAddress,
  exchange: MyExchange,
  agreementID: number
) => {
  const { futureValue } = args;
  const amount = toUSDC(futureValue!);
  await mockUSDC.transfer(borrower.address, amount);
  await mockUSDC.connect(borrower).approve(exchange.address, amount);
  await exchange.connect(borrower).repay(agreementID, amount);
};
