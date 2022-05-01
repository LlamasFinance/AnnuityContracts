//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IAnnuity.sol";
import "./AgreementStorage.sol";
import "./Liquidator.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

/**
 * @title Annuity
 * @author Team
 * @notice It defines the Annuity contract
 **/
contract Annuity is IAnnuity, Liquidator ,AgreementStorage{
    address public constant _WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant _USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;

    //USDC contract object
    IERC20 public USDCcontract=IERC20(_USDC);

    // TODO pass addresses through constructor for real deployments
    constructor() {
        swapRouter = ISwapRouter(_swapRouter);
        WETH9 = _WETH9;
        USDC = _USDC;
    }

    function createAgreement(
        uint256 _rate,
        uint256 _period,
        uint256 _deposit
    ) public override returns (uint256) {
        // require USDC value sent == deposit  && transfer usdc from sender to contract
         (bool success,)=_USDC.delegatecall(abi.encodeWithSelector(USDCcontract.transfer.selector,address(this),_deposit));
         require(success,"Transfer of funds to the contract failed");
      
        /* create Agreement with deposit, rate, period, msg.sender=lender, status=pending */
        Agreement memory newAgreement= Agreement({
            deposit:_deposit,
            collateral:0,
            paidBackAmt:0,
            start:0,
            period:_period,
            rate:_rate,
            status:Status.Pending,
            lender:msg.sender,
            borrower:address(0)
        });
        
        //mapping the id to Agreement
        numAgreement++;
        agreements[numAgreement]=newAgreement;

        //TODO emit createAgreement event
        return numAgreement;
    }

    function borrow(uint256 agreementId)
        public
        payable
        override
        onlyIfEnoughCollateral(agreementId, msg.value)
    {
        // update Agreement
        Agreement storage agreement=agreements[agreementId];
        require(agreement.status==Status.Pending,"Agreement already closed");
        agreement.start=block.timestamp;
        agreement.borrower=msg.sender;
        agreement.status=Status.Active;
        agreement.collateral=msg.value;
        
         // transfer USDC to borrower
        bool success= USDCcontract.transfer(msg.sender,agreement.deposit);
        require(success,"Transfer of USDC failed");
        //TODO emit Borrow
    }

    //collateral amount will be the msg.value
    function addCollateral(uint256 agreementId)
        public
        payable
        override
        onlyBorrower(agreementId)
        onlyIfActive(agreementId)
    {
        Agreement storage agreement=agreements[agreementId];
        // update Agreement
        agreement.collateral+=msg.value;
        //TODO emit AddCollateral
    }

    function repayLoan(uint256 agreementId, uint256 amount)
        public
        payable
        onlyBorrower(agreementId)
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
