import { ethers } from "hardhat";

async function main() {
  const Exchange = await ethers.getContractFactory("Exchange");
  const exchange = await Exchange.deploy();

  await exchange.deployed();

  console.log("Exchange deployed to: ", exchange.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
