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
contract Annuity is IAnnuity, Liquidator {
    //USDC contract object
    IERC20 private usdcToken;

    // TODO pass addresses through constructor for real deployments
    constructor() {
        Swapper.swapRouter = ISwapRouter(AgreementStorage._swapRouter);
        Swapper.WETH9 = AgreementStorage._WETH9;
        Swapper.USDC = AgreementStorage._USDC;
        PriceConsumer.priceFeedAddr = AgreementStorage._USDC;
        usdcToken = IERC20(AgreementStorage._USDC);
    }

    function createAgreement(
        uint256 _rate,
        uint256 _duration,
        uint256 _deposit
    ) public override returns (uint256 agreementId) {
        // require USDC value sent == deposit  && transfer usdc from sender to contract
        (bool success, ) = _USDC.delegatecall(
            abi.encodeWithSelector(
                usdcToken.transfer.selector,
                address(this),
                _deposit
            )
        );
        require(success, "Transfer of funds to the contract failed");

        /* create Agreement with deposit, rate, period, msg.sender=lender, status=pending */
        Agreement memory newAgreement = Agreement({
            deposit: _deposit,
            collateral: 0,
            repaidAmt: 0,
            start: 0,
            duration: _duration,
            rate: _rate,
            status: Status.Pending,
            lender: payable(msg.sender),
            borrower: payable(address(0))
        });

        //mapping the id to Agreement
        numAgreements++;
        agreements[numAgreements] = newAgreement;

        //TODO emit createAgreement event
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
