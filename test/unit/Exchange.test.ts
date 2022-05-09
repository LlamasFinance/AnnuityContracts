// import { isBigNumberish } from "@ethersproject/bignumber/lib/bignumber";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { BigNumber, BigNumberish } from "ethers";
// import { ethers } from "hardhat";
// import { MockV3Aggregator } from "../../typechain";
// import { Exchange } from "../../typechain/Exchange";
// import { MockERC20 } from "../../typechain/MockERC20";

// // Data
// const constants = {
//   ethDecimals: 18,
//   tokenDecimals: 6,
//   pricefeedDecimals: 8,
//   ethUsdcValue: 3000,
//   liquidationThreshold: 80,
// };

// // Utils

// const toWEI = (amount: number | string | BigNumber) => {
//   return ethers.utils.parseUnits(amount.toString(), constants.ethDecimals);
// };

// const toUSDC = (amount: number | string | BigNumber) => {
//   return ethers.utils.parseUnits(amount.toString(), constants.tokenDecimals);
// };

// const toETH = (amount: number | string | BigNumber) => {
//   return ethers.utils.formatUnits(amount.toString(), constants.ethDecimals);
// };

// const toPriceFeed = (amount: number | string | BigNumber) => {
//   return ethers.utils.parseUnits(
//     amount.toString(),
//     constants.pricefeedDecimals
//   );
// };

// const calcFutureValue = (
//   deposit: number,
//   rate: number,
//   duration: number
// ): number => {
//   return deposit * (1 + rate / 1000) * duration;
// };

// const calcReqCollateral = (futureValue: number): number => {
//   const { liquidationThreshold, ethUsdcValue } = constants;
//   // ((200-80)*$1000)/$3000/ETH = (1200/3000) ETH
//   return ((200 - liquidationThreshold) * futureValue) / (ethUsdcValue * 100);
// };

// // Deploy Functions

// const deployExchange = async () => {
//   const Exchange = await ethers.getContractFactory("Exchange");
//   let exchange = await Exchange.deploy();
//   await exchange.deployed();
//   return exchange;
// };

// const deployMockUSDC = async () => {
//   const MockUSDC = await ethers.getContractFactory("MockERC20");
//   let mockUSDC = await MockUSDC.deploy(
//     "USD Coin",
//     "USD",
//     constants.tokenDecimals
//   );
//   await mockUSDC.deployed();
//   return mockUSDC;
// };

// const deployMockAggregator = async () => {
//   const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");

//   let mockAggregator = await MockV3Aggregator.deploy(
//     constants.pricefeedDecimals,
//     toPriceFeed(constants.ethUsdcValue)
//   );
//   await mockAggregator.deployed();
//   return mockAggregator;
// };

// // Interactions
// describe("Exchange", function () {
//   let exchange: Exchange;
//   let mockUSDC: MockERC20;
//   let mockAggregator: MockV3Aggregator;
//   let deployer: SignerWithAddress;
//   let lender: SignerWithAddress;
//   let borrower: SignerWithAddress;

//   interface agreementArgs {
//     agreementID?: number;
//     deposit?: number;
//     lenderTokens?: BigNumber;
//     duration?: number;
//     rate?: number;
//     futureValue?: number;
//     collateral?: number;
//     collateralTokens?: BigNumber;
//     addedCollateralTokens?: BigNumber;
//   }
//   let args: agreementArgs = {};
//   args = { deposit: 1000, lenderTokens: toUSDC(1000), duration: 1, rate: 50 };
//   args.futureValue = calcFutureValue(args.deposit!, args.rate!, args.duration!);
//   args.collateral = calcReqCollateral(args.futureValue!);
//   args.collateralTokens = toWEI(args.collateral!).add(1);
//   args.addedCollateralTokens = toWEI(1);

//   //   SETUP
//   this.beforeEach(async function () {
//     [deployer, lender, borrower] = await ethers.getSigners();
//     // Exchange
//     exchange = await deployExchange();
//     // USDC
//     mockUSDC = await deployMockUSDC();
//     // PriceFeeds
//     mockAggregator = await deployMockAggregator();
//     // Initialize
//     exchange.setLenderToken(mockUSDC.address, mockAggregator.address);
//   });

//   it("should initilize correctly", async function () {
//     expect(await exchange.owner()).to.equal(deployer.address);
//     expect(await exchange.s_lenderToken()).to.equal(mockUSDC.address);
//     expect(await exchange.s_priceFeed()).to.equal(mockAggregator.address);
//     console.log(
//       "Exchange address : %s\nUSDC address : %s\nAggregator address : %s\n",
//       exchange.address,
//       mockUSDC.address,
//       mockAggregator.address
//     );
//   });

//   //   PROPOSE AGREEMENT
//   const proposeAgreement = async () => {
//     const { lenderTokens, duration, rate } = args;
//     mockUSDC.transfer(lender.address, lenderTokens!);
//     await mockUSDC.connect(lender).approve(exchange.address, lenderTokens!);
//     const tx = await exchange
//       .connect(lender)
//       .propose(lenderTokens!, duration!, rate!);
//     const receipt = await tx.wait();
//     const agreementID = receipt.events?.filter((x) => {
//       return x.event == "Propose";
//     })[0].args?.id;
//     return agreementID;
//   };

//   describe("Agreement being proposed", async () => {
//     let { lenderTokens, duration, rate, agreementID } = args;

//     this.beforeEach(async () => {
//       agreementID = await proposeAgreement();
//     });

//     it("Should have the correct id", async () => {
//       expect(agreementID).to.equal(1);
//     });

//     it("Should store a new and correct agreement", async () => {
//       const agreement = await exchange.s_idToAgreement(agreementID!);
//       expect(agreement.lender).to.equal(lender.address);
//       // ((1000+50)*1)/1000 = 1050
//       expect(agreement.futureValue).to.equal(
//         lenderTokens!.mul((1000 + rate!) * duration!).div(1000)
//       );
//     });

//     it("Should emit a Propose event", async () => {
//       const filter = exchange.filters.Propose(lender.address, agreementID);
//       const event = await exchange.queryFilter(filter);
//       expect(event[0].args.amount).to.equal(lenderTokens);
//     });
//   });

//   // ACTIVATE AGREEMENT
//   const activateAgreement = async (agreementID: number) => {
//     const { collateralTokens } = args;
//     await exchange.connect(borrower).activate(agreementID, collateralTokens!, {
//       value: collateralTokens!,
//     });
//   };
//   describe("Agreement being activated", async () => {
//     let { lenderTokens, collateral, deposit, agreementID } = args;

//     this.beforeEach(async () => {
//       agreementID = await proposeAgreement();
//       await activateAgreement(agreementID!);
//     });

//     it("Should activate the agreement correctly", async () => {
//       expect((await exchange.s_idToAgreement(agreementID!)).status).to.equal(1);
//     });

//     it("Should convert USDC to ETH correctly", async () => {
//       const weiAmount = await exchange.getEthValueFromToken(lenderTokens!);
//       expect(weiAmount).to.equal(toWEI(deposit!).div(constants.ethUsdcValue));
//     });

//     it("Should calculate minimum required collateral correctly", async () => {
//       const minReqCollateral = await exchange.getMinReqCollateral(agreementID!);
//       expect(minReqCollateral).to.equal(toWEI(collateral!));
//     });
//   });

//   //   AGREEMENT STATUS = ACTIVE
//   describe("Methods while agreement is in status = Active", async function () {
//     let { collateralTokens, addedCollateralTokens, futureValue, agreementID } =
//       args;

//     this.beforeEach(async () => {
//       agreementID = await proposeAgreement();
//       await activateAgreement(agreementID!);
//       await mockUSDC.transfer(borrower.address, toUSDC(futureValue!));
//     });

//     it("Should let the borrower add more collateral", async () => {
//       await exchange
//         .connect(borrower)
//         .addCollateral(agreementID!, addedCollateralTokens!, {
//           value: addedCollateralTokens!,
//         });
//       expect(
//         (await exchange.s_idToAgreement(agreementID!)).collateral
//       ).to.equal(collateralTokens!.add(addedCollateralTokens!));
//     });

//     it("Should let the borrower withdraw some collateral", async () => {
//       const amount = toWEI(100);
//       await exchange
//         .connect(borrower)
//         .addCollateral(agreementID!, amount, { value: amount });
//       await exchange.connect(borrower).withdrawCollateral(agreementID!, amount);

//       const filter = exchange.filters.WithdrawCollateral(
//         borrower.address,
//         agreementID!
//       );
//       const event = await exchange.queryFilter(filter);
//       expect(event[0].args.amount).to.equal(amount);
//     });

//     it("Should let the borrower repay part of the loan", async () => {
//       let amount = toUSDC(futureValue!).div(2);
//       await mockUSDC.connect(borrower).approve(exchange.address, amount);
//       await exchange.connect(borrower).repay(agreementID!, amount);
//       expect((await exchange.s_idToAgreement(agreementID!)).repaidAmt).to.equal(
//         amount
//       );
//     });

//     it("Should let the borrower repay all of the loan", async () => {
//       await repayEntireLoan(agreementID!);
//       const agreement = await exchange.s_idToAgreement(agreementID!);
//       expect(agreement.repaidAmt).to.equal(toUSDC(futureValue!));
//       expect(agreement.status).to.equal(2);
//     });
//   });

//   // AGREEMENT STATUS = REPAID
//   const repayEntireLoan = async (agreementID: number) => {
//     const { futureValue } = args;
//     const amount = toUSDC(futureValue!);
//     await mockUSDC.transfer(borrower.address, amount);
//     await mockUSDC.connect(borrower).approve(exchange.address, amount);
//     await exchange.connect(borrower).repay(agreementID, amount);
//   };
//   describe("Methods while agreement status = Repaid", async () => {
//     let { futureValue, agreementID } =
//       args;

//     this.beforeEach(async () => {
//       agreementID = await proposeAgreement();
//       await activateAgreement(agreementID!);
//       await repayEntireLoan(agreementID!);
//     });

//     it("Should let the lender withdraw the future value", async () => {
//       let lenderBalance1 = await mockUSDC.balanceOf(lender.address);
//       await exchange.connect(lender).close(agreementID!);
//       let lenderBalance2 = await mockUSDC.balanceOf(lender.address);
//       expect(lenderBalance2.sub(lenderBalance1)).equals(toUSDC(futureValue!));
//     });
//   });
// });
