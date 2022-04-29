//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IAnnuity.sol";
import "./Liquidator.sol";

/**
 * @title Annuity
 * @author Team
 * @notice It defines the Annuity contract
 **/
contract Annuity is IAnnuity, Liquidator {
    
    function createAgreement(
        uint256 rate,
        uint256 period,
        uint256 deposit
    ) public override returns (uint256 agreementId) {}

    function borrow(uint256 agreementId, uint256 collateral) public payable override {}

    function addCollateral(uint256 agreementId, uint256 amount)
        public
        payable
        override
    {}

    function withdrawDeposit(uint256 agreementId) public override {}

    function withdrawCollateral(uint256 agreementId, uint256 amount) public override {
        getUndercollateralizedAgreements();
    }
}
