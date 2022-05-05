//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IAnnuity.sol";
import "./AgreementStorage.sol";
import "./Liquidator.sol";
import "./Swapper.sol";
import "hardhat/console.sol";

contract Annuity is IAnnuity, Liquidator {
    address public owner;
    //USDC contract object
    IERC20 private usdcToken;

    //Events
    event CreateAgreement(uint256 agreementId, address lender);
    event BorrowedAgreement(uint256 agreementId, address borrower);
    event RepaidAgreement(uint256 agreementId, uint256 amount);
    event AddCollateral(uint256 agreementId, uint256 amount);
    event WithdrawDeposit(uint256 agreementId, uint256 amount);
    event WithdrawCallateralBeforeTotalRepay(
        uint256 agreementId,
        uint256 amount
    );
    event WithdrawTotalCollateralAfterTotalRepay(
        uint256 agreementId,
        uint256 amount
    );

    // TODO pass addresses through constructor for real deployments

    constructor(address usdc, address mockPriceFeed) Liquidator(mockPriceFeed) {
        Swapper.swapRouter = ISwapRouter(AgreementStorage._swapRouter);
        Swapper.WETH9 = AgreementStorage._WETH9;
        Swapper.USDC = usdc;
        usdcToken = IERC20(usdc);
        owner = msg.sender;
    }

    function createAgreement(
        uint256 _rate,
        uint256 _duration,
        uint256 _deposit
    ) public override returns (uint256 agreementId) {
        require(
            _deposit >= 3154000000,
            "Cant deposit funds lesser than 3154 USDC"
        );
        /// create Agreement
        uint256 totalSecInYear = 31536000;
        //formula for caculating the totalPayBackAmountWithInterest
        uint256 _totalPayBackAmountWithInterest = (_deposit /
            (100 * totalSecInYear)) *
            (100 * totalSecInYear + (_rate * _duration));

        Agreement memory newAgreement = Agreement({
            deposit: _deposit,
            collateral: 0,
            repaidAmt: 0,
            totalPayBackAmountWithInterest: _totalPayBackAmountWithInterest,
            start: 0,
            duration: _duration,
            rate: _rate,
            status: Status.Pending,
            lender: payable(msg.sender),
            borrower: payable(address(0))
        });

        // increment agreement count to use as id for mapping
        numAgreements++;
        agreements[numAgreements] = newAgreement;

        // transfer lender's usdc to this contract

        // //delegatecall approach
        // (bool success, ) = address(usdcToken).delegatecall(
        //     abi.encodeWithSelector(
        //         usdcToken.transfer.selector,
        //         address(this),
        //         deposit
        //     )
        // );

        TransferHelper.safeTransferFrom(
            address(usdcToken),
            msg.sender,
            address(this),
            _deposit
        );

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
        emit BorrowedAgreement(agreementId, msg.sender);
    }

    function addCollateral(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        require(amount == msg.value, "Amount is not equal to msg.value");

        //transfer collateral amount && update Agreement
        Agreement storage agreement = agreements[agreementId];
        agreement.collateral += amount;

        emit AddCollateral(agreementId, amount);
    }

    function repay(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        require(amount > 0, "Amount should be grater than zero");
        Agreement storage agreement = agreements[agreementId];

        uint256 totalPayBackAmountWithInterest = agreement
            .totalPayBackAmountWithInterest;

        uint256 repaidAmt = agreement.repaidAmt;
        // the borrower can repay the maximum amount of totalPayBackAmountWithInterest
        if (repaidAmt + amount > totalPayBackAmountWithInterest) {
            amount = totalPayBackAmountWithInterest - repaidAmt;
        }
        //update the repaidAmt of agreement
        agreement.repaidAmt += amount;

        if (agreement.repaidAmt == totalPayBackAmountWithInterest) {
            agreement.status = Status.Repaid;
        }

        // transfer usdc amount
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            msg.sender,
            address(this),
            amount
        );
        emit RepaidAgreement(agreementId, amount);
    }

    function withdrawDeposit(uint256 agreementId)
        public
        override
        onlyLender(agreementId)
        onlyIfRepaid(agreementId)
    {
        // update Agreement
        Agreement storage agreement = agreements[agreementId];
        agreement.status = Status.Closed;
        // transfer deposit
        uint256 totalPayBackAmountWithInterest = agreement
            .totalPayBackAmountWithInterest;
        bool success = usdcToken.transfer(
            msg.sender,
            totalPayBackAmountWithInterest
        );
        require(success, "Transfer of USDC failded");
        // emit WithdrawDeposit
        emit WithdrawDeposit(agreementId, totalPayBackAmountWithInterest);
    }

    //if in case the price of eth rices and borrower wants to withdraw some collateral(still the minimum collateral must be there)
    function withdrawCollateralBeforeTotalRepay(
        uint256 agreementId,
        uint256 amount
    )
        public
        override
        onlyBorrower(agreementId)
        onlyIfEnoughCollateral(
            agreementId,
            (agreements[agreementId].collateral - amount)
        )
        onlyIfActive(agreementId)
    {
        // update Agreement
        Agreement storage agreement = agreements[agreementId];
        agreement.collateral -= amount;
        // transfer collateral
        (bool success, ) = msg.sender.call{value: amount}("");
        require(
            success,
            "Transfering of some part of collateral to borrower failed"
        );
        // emit WithdrawCallateralBeforeRepay
        emit WithdrawCallateralBeforeTotalRepay(agreementId, amount);
    }

    //In case borrower has repaid the totalPayBackAmountWithInterest and wants to withdraw his total collateral
    function withdrawCollateralAfterTotalRepay(uint256 agreementId)
        public
        override
        onlyBorrower(agreementId)
    {
        Agreement storage agreement = agreements[agreementId];
        require(
            (agreement.status == Status.Repaid ||
                agreement.status == Status.Closed),
            "Agreement not settled yet"
        );
        //check if the collateral of this agreement is already withdrawn or not
        require(
            !totalCollateralWithdrawn[agreementId],
            "total collateral of this agrreement is already withdrawn"
        );

        // set the mapping to true
        totalCollateralWithdrawn[agreementId] = true;
        uint256 totalCollateral = agreement.collateral;

        //transfer the total collateral of agreement to borrower
        (bool success, ) = msg.sender.call{value: totalCollateral}("");
        require(success, "Transfering of collateral to borrower failed");
        emit WithdrawTotalCollateralAfterTotalRepay(
            agreementId,
            totalCollateral
        );
    }

    function withdrawAllfunds() public {
        require(msg.sender == owner, "you are not the owner");
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
