//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/**
 * @title IAnnuity
 * @author Team
 * @notice Defines the basic interface for the Annuity project
 **/
interface IAnnuity {
    function createAgreement(
        uint256 rate,
        uint256 duration,
        uint256 deposit
    ) external returns (uint256 agreementId);

    function borrow(uint256 agreementId, uint256 collateral) external payable;

    function addCollateral(uint256 agreementId, uint256 amount)
        external
        payable;

    function repay(uint256 agreementId, uint256 amount) external payable;

    function withdrawDeposit(uint256 agreementId) external;

    function withdrawCollateral(uint256 agreementId, uint256 amount) external;

    // events
    event CreateAgreement(
        uint256 indexed id,
        address indexed lender,
        uint256 deposit
    );
    event Borrow(
        uint256 indexed id,
        address indexed borrower,
        uint256 indexed collateral
    );
    event AddCollateral(
        uint256 indexed id,
        address indexed borrower,
        uint256 indexed amount
    );
    event Repay(
        uint256 indexed id,
        address indexed borrower,
        uint256 indexed amount,
        uint256 newStatus
    );
    event WithdrawDeposit(
        uint256 indexed id,
        address indexed lender,
        uint256 indexed futureValue
    );
}
