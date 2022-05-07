import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { parseUnits } from "@ethersproject/units";

const usdcDecimals = 6;

const num = parseUnits("100", usdcDecimals);
console.log(num);
