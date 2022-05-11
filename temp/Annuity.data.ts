import { parseUnits } from "@ethersproject/units";
import { BigNumber, BigNumberish, ethers } from "ethers";

// test data
export enum Status {
  Pending = 0,
  Active,
  Repaid,
  Closed,
}

export interface AnnuityStruct {
  deposit: BigNumber;
  collateral: BigNumber;
  repaidAmt: BigNumber;
  start: BigNumber;
  duration: BigNumber;
  rate: BigNumber;
  status: number;
  lender: string;
  borrower: string;
}

// $60k deposit
// 5% rate
// 10 years or 315360000 seconds
// 60 * [1+(0.05 * 10)] = $90,000 payout

/*

  deposit * (1+((rate/100)*time));

 ( deposit/100)* [ 100+(rate*time) ]

 



*/
// 1.5x liquidation threshold
// Borrower must maintain at least $135k
// 50 eth collateral (assum $3k/eth)

// usdc has 6 decimals. eth has 18 decimals.
export const usdcDecimals = 6;
export const ethDecimals = 18;

// mint 500k usdc for deployer
export const usdcMintAmt = parseUnits("500000", usdcDecimals);

export const annuityObj: AnnuityStruct = {
  deposit: parseUnits("60000", usdcDecimals),
  collateral: parseUnits("50.0", ethDecimals),
  repaidAmt: parseUnits("3000", usdcDecimals),
  start: BigNumber.from(Date.now()),
  duration: BigNumber.from("315360000"),
  rate: BigNumber.from("5"),
  status: Status.Pending,
  lender: "",
  borrower: "",
};

export * as data from "./Annuity.data";
