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

    function withdrawCollateralBeforeTotalRepay(
        uint256 agreementId,
        uint256 amount
    ) external;

    function withdrawCollateralAfterTotalRepay(
        uint256 agreementId
    ) external;

}
