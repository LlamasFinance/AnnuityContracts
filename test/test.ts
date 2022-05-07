import { ethers } from "hardhat";
import { expect, use } from "chai";
import { BigNumber, Contract } from "ethers";
import { solidity } from "ethereum-waffle";

use(solidity);
const deployerAmt = BigNumber.from("1000000000000"); //1000k USDC
const lenderAmt = BigNumber.from("200000000000"); //200k USDC
const borrowedAmt = BigNumber.from("99999998580"); //100k USDC
const totalPayBackAmt = BigNumber.from("110000000000");
const initialBorrowerAmt = BigNumber.from("100000000000"); //100k USDC
const rate = BigNumber.from(10);
const duration = BigNumber.from("31536000"); //In seconds

const collateral = "100.00"; //In Eth
const ethPrice = "300000000000"; // 3k USDC

describe("Annuity contract", () => {
  let Annuity: Contract;
  let USDC: Contract;
  let MockPriceFeed: Contract;
  let tx;
  let deployer, lender: any, borrower: any;
  beforeEach(async () => {
    [deployer, lender, borrower] = await ethers.getSigners();
    let temp1 = await ethers.getContractFactory("MockV3Aggregator");
    MockPriceFeed = await temp1.deploy(18, BigNumber.from(ethPrice));
    await MockPriceFeed.deployed();

    let temp2 = await ethers.getContractFactory("USDC");
    USDC = await temp2.deploy(deployerAmt);
    await USDC.deployed();

    let temp3 = await ethers.getContractFactory("Annuity");
    Annuity = await temp3.deploy(USDC.address, MockPriceFeed.address);
    await Annuity.deployed();

    //transfer 200K to lender
    tx = await USDC.transfer(lender.address, lenderAmt);
    await tx.wait();
    //transfer 100K as initial balance to borrower
    tx = await USDC.transfer(borrower.address, initialBorrowerAmt);
    await tx.wait();
  });

  it("Lender create an agreement", async () => {
    console.log("Now checking createAgreement : - ");
    //lender approving the Annuity contract for 100k USDC
    tx = await USDC.connect(lender).approve(Annuity.address, borrowedAmt);
    await tx.wait();

    console.log(
      "Before lender created agreement , balance of lender is %d and balance of borrower is %d ",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //lender creates the agreement
    tx = await Annuity.connect(lender).createAgreement(
      rate,
      duration,
      borrowedAmt
    );
    let temp = await tx.wait();

    const id = temp.events?.filter((x: { event: string }) => {
      return x.event === "CreateAgreement";
    })[0].args?.agreementId;

    expect(id).to.equal(1);
    tx = await Annuity.connect(borrower).agreements(1);
    // console.log("Created agreement is " + tx);

    console.log(
      "After lender created agreement , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );
  });

  it("Borrower borrow agreement", async () => {
    console.log("Now checking borrow : - ");
    //lender approving the Annuity contract for 100k USDC
    tx = await USDC.connect(lender).approve(Annuity.address, borrowedAmt);
    await tx.wait();

    console.log(
      "Before lender created agreement , balance of lender is %d and balance of borrower is %d ",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //lender creates the agreement
    tx = await Annuity.connect(lender).createAgreement(
      rate,
      duration,
      borrowedAmt
    );
    await tx.wait();

    console.log(
      "After lender created agreement , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    tx = await Annuity.connect(borrower).borrow(
      1,
      ethers.utils.parseEther(collateral),
      {
        value: ethers.utils.parseEther(collateral),
      }
    );
    let temp = await tx.wait();

    const id = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    const borrowerAddress = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.borrower;
    expect(borrowerAddress).to.equal(borrower.address);

    console.log(
      "After borrower borrowed agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );
  });

  it("Borrower repays the loan", async () => {
    console.log("Now checking repay : - ");
    //lender approving the Annuity contract for 100k USDC
    tx = await USDC.connect(lender).approve(Annuity.address, borrowedAmt);
    await tx.wait();

    console.log(
      "Before lender created agreement , balance of lender is %d and balance of borrower is %d ",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //lender creates the agreement
    tx = await Annuity.connect(lender).createAgreement(
      rate,
      duration,
      borrowedAmt
    );
    await tx.wait();

    console.log(
      "After lender created agreement , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );
    tx = await Annuity.connect(borrower).agreements(1);
    // console.log(tx);

    tx = await Annuity.connect(borrower).borrow(
      1,
      ethers.utils.parseEther(collateral),
      {
        value: ethers.utils.parseEther(collateral),
      }
    );
    let temp = await tx.wait();

    let id = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    const borrowerAddress = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.borrower;
    expect(borrowerAddress).to.equal(borrower.address);

    console.log(
      "After borrower borrowed agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //Borrower approve Annuity contract for totalPayBackAmount
    tx = await USDC.connect(borrower).approve(Annuity.address, totalPayBackAmt);
    //borrower repays the agreement
    tx = await Annuity.connect(borrower).repay(1, totalPayBackAmt);
    temp = await tx.wait();

    console.log(
      "After borrower repaid agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    id = temp.events?.filter((x: { event: string }) => {
      return x.event === "RepaidAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    let amount = temp.events?.filter((x: { event: string }) => {
      return x.event === "RepaidAgreement";
    })[0].args?.amount;
    let x = await Annuity.connect(borrower).agreements(id);
    expect(amount).to.equal(x.totalPayBackAmountWithInterest);
  });

  it("Lender should get totalPayBackAmount", async () => {
    console.log("Now checking withdrawDeposit : - ");
    //lender approving the Annuity contract for 100k USDC
    tx = await USDC.connect(lender).approve(Annuity.address, borrowedAmt);
    await tx.wait();

    console.log(
      "Before lender created agreement , balance of lender is %d and balance of borrower is %d ",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //lender creates the agreement
    tx = await Annuity.connect(lender).createAgreement(
      rate,
      duration,
      borrowedAmt
    );
    await tx.wait();

    console.log(
      "After lender created agreement , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );
    tx = await Annuity.connect(borrower).agreements(1);
    // console.log(tx);

    tx = await Annuity.connect(borrower).borrow(
      1,
      ethers.utils.parseEther(collateral),
      {
        value: ethers.utils.parseEther(collateral),
      }
    );
    let temp = await tx.wait();

    let id = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    const borrowerAddress = temp.events?.filter((x: { event: string }) => {
      return x.event === "BorrowedAgreement";
    })[0].args?.borrower;
    expect(borrowerAddress).to.equal(borrower.address);

    console.log(
      "After borrower borrowed agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    //Borrower approve Annuity contract for totalPayBackAmount
    tx = await USDC.connect(borrower).approve(Annuity.address, totalPayBackAmt);
    //borrower repays the agreement
    tx = await Annuity.connect(borrower).repay(1, totalPayBackAmt);
    temp = await tx.wait();

    console.log(
      "After borrower repaid agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );

    id = temp.events?.filter((x: { event: string }) => {
      return x.event === "RepaidAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    let amount = temp.events?.filter((x: { event: string }) => {
      return x.event === "RepaidAgreement";
    })[0].args?.amount;
    let x = await Annuity.connect(borrower).agreements(id);
    expect(amount).to.equal(x.totalPayBackAmountWithInterest);

    tx = await Annuity.connect(lender).withdrawDeposit(1);
    temp = await tx.wait();

    id = temp.events?.filter((x: { event: string }) => {
      return x.event === "WithdrawDeposit";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
    amount = temp.events?.filter((x: { event: string }) => {
      return x.event === "WithdrawDeposit";
    })[0].args?.amount;
    expect(amount).to.equal(x.totalPayBackAmountWithInterest);

    console.log(
      "After lender wihdraw his deposit of agreement(agreement 1) , balance of lender is %d and balance of borrower is %d",
      await USDC.balanceOf(lender.address),
      await USDC.balanceOf(borrower.address)
    );
  });
});
