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
    constructor(address usdc, address weth) {
        addrUSDC = usdc;
        usdcToken = IERC20(addrUSDC);
        wethToken = IWETH9(weth);
    }

    function createAgreement(
        uint256 rate,
        uint256 duration,
        uint256 deposit
    )
        public
        override
        onlyIfValuesMatch(
            usdcToken.allowance(msg.sender, address(this)),
            deposit
        )
        returns (uint256 agreementId)
    {
        require(rate <= 10, "Rate can't be greater than 100%");

        // transfer lender's usdc to this contract
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            msg.sender,
            address(this),
            deposit
        );

        /// create Agreement
        uint256 futureValue = (deposit * (100 + rate * duration)) / 100;
        Agreement memory newAgreement = Agreement({
            deposit: deposit,
            collateral: 0,
            repaidAmt: 0,
            futureValue: futureValue,
            start: 0,
            duration: duration,
            rate: rate,
            status: Status.Pending,
            lender: payable(msg.sender),
            borrower: payable(address(0))
        });

        // increment agreement count to use as id for mapping
        numAgreements++;
        agreements[numAgreements] = newAgreement;

        // emit event and return id
        emit CreateAgreement(numAgreements, msg.sender, deposit);
        return numAgreements;
    }

    function borrow(uint256 agreementId, uint256 collateral)
        public
        payable
        override
        onlyIfPending(agreementId)
        onlyIfEnoughCollateral(agreementId, msg.value)
        onlyIfValuesMatch(msg.value, collateral)
    {
        console.log("Borrow msg.value received : ", msg.value);
        // convert eth to weth
        TransferHelper.safeTransferETH(address(wethToken), collateral);

        // update Agreement
        Agreement storage agreement = agreements[agreementId];
        // solhint-disable-next-line not-rely-on-time
        agreement.start = block.timestamp;
        agreement.borrower = payable(msg.sender);
        agreement.status = Status.Active;
        agreement.collateral = collateral;

        // transfer deposit USDC to borrower
        console.log(
            "Contract USDC Balance before: ",
            usdcToken.balanceOf(address(this))
        );
        console.log("details", agreement.deposit, agreement.borrower);
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            address(this),
            agreement.borrower,
            agreement.deposit
        );
        console.log(
            "Borrower USDC Balance after: ",
            usdcToken.balanceOf(agreement.borrower)
        );

        emit Borrow(agreementId, msg.sender, collateral);
    }

    function addCollateral(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
        onlyIfValuesMatch(msg.value, amount)
    {
        Agreement storage agreement = agreements[agreementId];
        agreement.collateral += amount;
        TransferHelper.safeTransferETH(address(wethToken), amount);
        emit AddCollateral(agreementId, agreement.borrower, amount);
    }

    function repay(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyIfActive(agreementId)
        onlyIfValuesMatch(
            usdcToken.allowance(msg.sender, address(this)),
            amount
        )
    {
        Agreement storage agreement = agreements[agreementId];
        uint256 repaidAmt = agreement.repaidAmt;
        uint256 futureValue = agreement.futureValue;
        if (repaidAmt + amount > futureValue) {
            amount = futureValue - repaidAmt;
            // update agreement
            agreement.status = Status.Repaid;
        }

        // update agreement
        agreement.repaidAmt += amount;

        // transfer USDC to contract
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            msg.sender,
            address(this),
            amount
        );

        emit Repay(
            agreementId,
            agreement.borrower,
            amount,
            uint256(agreement.status)
        );
    }

    function withdrawDeposit(uint256 agreementId)
        public
        override
        onlyLender(agreementId)
        onlyIfRepaid(agreementId)
    {
        Agreement storage agreement = agreements[agreementId];

        // transfer USDC to lender
        address lender = agreement.lender;
        uint256 futureValue = agreement.futureValue;
        usdcToken.approve(lender, futureValue);
        TransferHelper.safeTransferFrom(
            address(usdcToken),
            address(this),
            lender,
            futureValue
        );

        emit WithdrawDeposit(agreementId, lender, futureValue);
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
        Agreement storage agreement = agreements[agreementId];
        wethToken.withdraw(amount);
        agreement.collateral -= amount;
        TransferHelper.safeTransferETH(agreement.borrower, amount);
    }
}
