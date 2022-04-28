//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Annuity {
    // Data
    enum Status {
        Pending,
        Active,
        Terminated
    }

    struct Agreement {
        uint256 deposit;
        uint256 collateral;
        uint256 start;
        uint256 period;
        uint256 rate;
        Status status;
        address payable lender;
        address payable borrower;
    }

    mapping(uint256 => Agreement) public agreements;
    uint256 public numAgreement;

    // Constructor
    constructor() {}

    // Public functions

    /**
     Return an agreement
     @param id, the id of the requested agreement
     */
    function getAgreement(uint256 id) public returns (Agreement) {
        return agreements[id];
    }

    /**
     Creates an agreement and increments numAgreements
     @param rate, the lender's desired interest rate % (i.e. 5%)
     @param period, the lender's desired lending period in years (i.e. 5 years)
     @param deposit, teh lender's initial deposit amount in USDC bits (i.e. 1000000 = 1 USDC) 
     @return int, the id of the newly created agreement
    */
    function createAgreement(
        uint256 rate,
        uint256 period,
        uint256 deposit
    ) public payable returns (uint256) {
        return 0;
    }

    /**
      Activates a pending agreement and changes its status to active
      @param id, the agreement's id,
      @param collateral, the required collateral that the sender is sending denominated in WETH
      @return bool, indicates whether the function ran successfully 
    */
    function activateAgreement(uint256 id, uint256 collateral)
        public
        payable
        returns (bool)
    {
        return true;
    }

    /**
     Adds more collateral to a specific Agreement
     @param id, the agreement id
     @param amount, the extra collateral amount that's being added demoninated in WETH
     @return bool, indicates whether successful or not
    */
    function addCollateral(uint256 id, uint256 amount)
        public
        payable
        returns (bool)
    {
        return true;
    }

    /**
     withdraws ETH collateral from an Agreement up to the liquidation threshold
     - Only the borrower can call this
     @param id, the agreement id
     @param amount, the requested withdraw amount in WETH
     @return bool, indicates whether successful or not
    */
    function withdrawCollateral(uint256 id, uint256 amount)
        public
        returns (bool)
    {
        return true;
    }

    /**
     Lets the borrower pay off some or all of their loan with USDC at any time. Updates the agreement. 
     @param id, the agreement's id
     @param amount, the amount they want to pay off in USDC bits
     @return bool, indicates whether successful or not
    */
    function payBackLoan(uint256 id, uint256 amount)
        public
        payable
        returns (bool)
    {
        return true;
    }

    /**
     Ends an agreement for the lender and send the appreciated value of USDC back to their address. Updates agreement and changes it's status to terminated.
     - Only lender can call this!
     - Elapsed time since start must be > the agreement's period
     @param id, the agreement's id
     @return bool, indicated whether successful or not
    */
    function terminateAgreement(uint256 id) public returns (bool) {
        return true;
    }

    /**
     Calculates the required WETH collateral for a specific agreement by multiplying the agreement's USDC deposit by 1.5 and converting to the current value of necessary WETH
     @param id, the agreement's id
     @return uint, the required WETH collateral needed
    */
    function calcReqCollateral(uint256 id) public returns (uint256) {
        return 0;
    }

    // Private functions
}
