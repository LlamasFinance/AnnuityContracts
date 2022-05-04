import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployMockContract, loadFixture, MockContract } from "ethereum-waffle";
import { ethers } from "hardhat";
import { Annuity, IERC20, USDC, WETH9 } from "../typechain";
import { data } from "./Annuity.data";
import AnnuityJSON from "../contracts/artifacts/Annuity_metadata.json";
const AnnuityABI = AnnuityJSON.output.abi;

describe("Annuity", function () {
  let annuity: Annuity;
  let mockAnnuity: MockContract;
  let usdc: USDC;
  let weth9: WETH9;
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
    let WETH9 = await ethers.getContractFactory("WETH9");
    weth9 = await WETH9.deploy();
    // deploy contract
    let Annuity = await ethers.getContractFactory("Annuity");
    annuity = await Annuity.deploy(usdc.address, weth9.address);
    await annuity.deployed();

    mockAnnuity = await deployMockContract(deployer, AnnuityABI);
    await mockAnnuity.deployed();

    console.log(
      `Annuity : %s\nMockAnnuity : %s\nUSDC : %s\nWETH9 : %s\nDeployer : %s\nLender : %s\nBorrower : %s\n`,
      annuity.address,
      mockAnnuity.address,
      usdc.address,
      weth9.address,
      deployer.address,
      lender.address,
      borrower.address
    );
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
      return x.event == "CreateAgreement";
    })[0].args?.id;
    expect(id).to.equal(1);

    // numAgreements should equal 1
    expect(await annuity.numAgreements()).to.equal(1);
  });

  const fixture = async () => {
    const { rate, duration, deposit } = data.annuityObj;
    usdc.transfer(lender.address, deposit);

    // creating an agreement should return an agreement id of 1
    usdc.connect(lender).approve(annuity.address, deposit);
    const tx = await annuity
      .connect(lender)
      .createAgreement(rate, duration, deposit);
  };

  it("Should borrow()", async function () {
    const id = 1;
    const { collateral } = data.annuityObj;
    await loadFixture(fixture);
    await annuity
      .connect(borrower)
      .borrow(id, collateral, { value: collateral });
    const amt = await usdc.balanceOf(borrower.address);
    console.log(amt);
  });
});
