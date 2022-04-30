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
    address public constant _WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant _USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // pass addresses through constructor for real deployments
    constructor() {
        swapRouter = ISwapRouter(_swapRouter);
        WETH9 = _WETH9;
        USDC = _USDC;
    }

    function createAgreement(
        uint256 rate,
        uint256 period,
        uint256 deposit
    ) public override returns (uint256 agreementId) {
        // transfer deposit
        // create Agreement
        // store Agreement
        // emit CreateAgreement
    }

    function borrow(uint256 agreementId, uint256 collateral)
        public
        payable
        override
        onlyIfEnoughCollateral(agreementId, collateral)
    {
        // transfer collateral
        // update Agreement
        // emit Borrow
    }

    function addCollateral(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        // transfer collateral amount
        // update Agreement
        // emit AddCollateral
    }

    function repay(uint256 agreementId, uint256 amount)
        public
        payable
        override
        onlyIfActive(agreementId)
    {
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
