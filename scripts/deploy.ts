// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  // mocks
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const mockV3Aggregator = await MockV3Aggregator.deploy();

  await mockV3Aggregator.deployed();
  // -----------
  console.log("MockV3Aggregator deployed to:", mockV3Aggregator.address);

  const USDC = await ethers.getContractFactory("USDC");
  const usdc = await USDC.deploy();

  await usdc.deployed();

  console.log("USDC deployed to:", usdc.address);
  // -----------
  const WETH9 = await ethers.getContractFactory("WETH9");
  const weth9 = await WETH9.deploy();

  await weth9.deployed();

  console.log("WETH9 deployed to:", weth9.address);
  // -----------

  // main
  const Annuity = await ethers.getContractFactory("Annuity");
  const annuity = await Annuity.deploy();

  await annuity.deployed();

  console.log("Annuity deployed to:", annuity.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
