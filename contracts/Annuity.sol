//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IAnnuity.sol";
import "./AgreementStorage.sol";
import "./Liquidator.sol";
import "./Swapper.sol";
import "hardhat/console.sol";

/**
 * @title Annuity
 * @author Team
 * @notice It defines the Annuity contract
 **/


// Agreement Storage --> (Swapper, PriceConsumer) --> Liquidator --> Annuity

contract Annuity is IAnnuity, Liquidator {
    //USDC contract object
    IERC20 private usdcToken;

    // TODO pass addresses through constructor for real deployments

 

    constructor(address usdc) {
        Swapper.swapRouter = ISwapRouter(AgreementStorage._swapRouter);
        Swapper.WETH9 = AgreementStorage._WETH9;
        Swapper.USDC = usdc;
        PriceConsumer.priceFeedAddr = usdc;
        usdcToken = IERC20(usdc);
    }

    function createAgreement(
        uint256 rate,
        uint256 duration,
        uint256 deposit
    ) public override returns (uint256 agreementId) {
        // transfer lender's usdc to this contract
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            msg.sender,
            address(this),
            deposit
        );

        /// create Agreement
        Agreement memory newAgreement = Agreement({
            deposit: deposit,
            collateral: 0,
            repaidAmt: 0,
            start: 0,
            duration: duration,
            rate: rate,

            status: Status.Pending,
            lender: payable(msg.sender),
            borrower: payable(address(0))
        });


        // increment agreement count to use as id for mapping
        numAgreements++;
        console.log("num agreements ", numAgreements);
        agreements[numAgreements] = newAgreement;

        // emit event and return id
        emit CreateAgreement(numAgreements, msg.sender);

        return numAgreements;
    }

    function borrow(uint256 agreementId, uint256 collateral)
        public
        payable
        override
        onlyIfEnoughCollateral(agreementId, msg.value)
        onlyIfPending(agreementId)
    {
        // require msg.value == collateral
        require(
            msg.value == collateral,
            "Actual sent value doesn't match collateral"
        );
        // update Agreement
        Agreement storage agreement = agreements[agreementId];
        agreement.start = block.timestamp;
        agreement.borrower = payable(msg.sender);
        agreement.status = Status.Active;
        agreement.collateral = msg.value;

        // transfer USDC to borrower
        bool success = usdcToken.transfer(msg.sender, agreement.deposit);
        require(success, "Transfer of USDC failed");
        //TODO emit Borrow
    }

    function addCollateral(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        require(amount==msg.value,"Amount is not equal to msg.value");
        // transfer collateral amount
        // update Agreement
        Agreement storage agreement=agreements[agreementId];
        agreement.collateral+=amount;
        //TODO emit AddCollateral
    }

    function repay(uint256 agreementId, uint256 amount)
        public
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        // check if amount >0
        require(amount>0,"Amount should be grater than zero");
        Agreement storage agreement=agreements[agreementId];
        uint agreementLoanAmount=agreement.deposit;

        //check if repay amount is greater than borrowed amount , if yes the send the diff back to borrower.
        uint totalPayBackAmountWithInterest;//TODO calculate this amount
        
        if(amount>=payBackAmountWithInterest){
          (bool success,)=  _USDC.delegatecall(abi.encodeWithSelector(usdcToken.transfer,selector,address(this),payBackAmountWithInterest));
          require(success,"Transfer of USDC to contract failed");
          agreement.repaidAmt=payBackAmountWithInterest;
          agreement.status=Status.Repaid;
        } else{
            //TODO 
        }
        // transfer usdc amount

        // update Agreement
        // emit Repay
    }

    function withdrawDeposit(uint256 agreementId)
        public
        override
        onlyLender(agreementId)
        onlyIfRepaid(agreementId)
    {
        // transfer deposit
        // update Agreement
        // emit WithdrawDeposit
    }

    function withdrawCollateral(uint256 agreementId, uint256 amount)
        public
        override
        onlyBorrower(agreementId)
        onlyIfEnoughCollateral(
            agreementId,
            (agreements[agreementId].collateral - amount)
        )
    {
        // transfer collateral
        // update Agreement
        // emit WithdrawCollateral
    }
}
