import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Annuity, IERC20, USDC } from "../typechain";
import { data } from "./Annuity.data"; 

describe("Annuity", function () {
  let annuity: Annuity;
  let usdc: USDC;
  let deployer: SignerWithAddress,
    lender: SignerWithAddress,
    borrower: SignerWithAddress;
  beforeEach(async () => {
    // set up accounts we'll be using.
    [deployer, lender, borrower] = await ethers.getSigners();
    // deploy mocks
    let USDC = await ethers.getContractFactory("USDC");
    // deployer has 500k usdc
    usdc = await USDC.deploy(data.usdcMintAmt.toString());
    // deploy contract
    let Annuity = await ethers.getContractFactory("Annuity");
    annuity = await Annuity.deploy(usdc.address);
    await annuity.deployed();
    console.log(annuity.address, deployer.address);
  });

  it("Should createAgreement()", async function () {
    const { rate, duration, deposit } = data.annuityObj;
    usdc.transfer(lender.address, deposit);

    // creating an agreement should return an agreement id of 1
    usdc.connect(lender).approve(annuity.address, deposit);
    const tx = await annuity
      .connect(lender)
      .createAgreement(rate, duration, deposit);
    const receipt = await tx.wait();
    // use emitted event to double check that id is correct
    const id = receipt.events?.filter((x) => {
      return x.event == "CreatedAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);

    // numAgreements should equal 1
    expect(await annuity.numAgreements()).to.equal(1);
  });
});
