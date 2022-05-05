import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("Annuity contract", function () {
  it("should create a agreement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const USDCfactory = await ethers.getContractFactory("USDC");
    const USDCtoken = await USDCfactory.deploy(BigNumber.from((1000000 * 10 ** 6).toString()));
    await USDCtoken.deployed();
    await USDCtoken.transfer(addr1.address,BigNumber.from(`${100000 * 10 ** 6}`));
    await USDCtoken.transfer(addr2.address,BigNumber.from(`${200000 * 10 ** 6}`) );

    const annuityFactory = await ethers.getContractFactory("Annuity");
    const AnnuityContract = await annuityFactory.deploy(USDCtoken.address);

    await AnnuityContract.deployed();
    console.log(
      "USDC address :- " +
        USDCtoken.address +
        "   AnnuityContract address :- " +
        AnnuityContract.address
    );
     let tx1= await USDCtoken.connect(owner).approve(AnnuityContract.address, BigNumber.from(`${100000 * 10 ** 6}`));
     let temp1=await tx1.wait();
      tx1 = await AnnuityContract.connect(owner).createAgreement(
      10,
      315360000,
     BigNumber.from(`${100000 * 10 ** 6}`)
    );
     temp1 = await tx1.wait();
    console.log(tx1, temp1);
    
   let tx2=await AnnuityContract.connect(addr1).borrow(1,ethers.utils.parseEther("200.0"));
    let temp2=await tx2.wait();

   const id= temp2.events?.filter((x)=>{
        return x.event==="BorrowedAgreement";
    })[0].args?.agreementId;
    expect(id).to.equal(1);
  });
});
