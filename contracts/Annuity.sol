//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

contract Annuity is KeeperCompatibleInterface {
    // DATA

    /*Pending (true when created by lender)
      Active (true when a borrower comes in)
      PaidFor (true when a borrower pays off loan)
      Terminated (true when the lender withdraws the appreciated value) \*/
    enum Status {
        Pending,
        Active,
        PaidFor,
        Terminated
    }

    struct Agreement {
        uint256 deposit;
        uint256 collateral;
        uint256 paidBackAmt;
        uint256 start;
        uint256 period;
        uint256 rate;
        Status status;
        address payable lender;
        address payable borrower;
    }

    mapping(uint256 => Agreement) public agreements;
    uint256 public numAgreement;

    // chainlink contract to get the price of eth
    AggregatorV3Interface internal priceFeed;
    /*use an interval in seconds and a timestamp to slow execution of Upkeep for Chainlink keepers.*/
    uint256 public immutable interval;
    uint256 public lastTimeStamp;

    // CONSTRUCTOR
    constructor() {
        // init chanlink vars
        /// TODO
        interval = 0;
        lastTimeStamp = 0;
        priceFeed = AggregatorV3Interface(address(msg.sender)); // ethUSD
    }

    // PUBLIC FUNCTIONS

    /**
     @notice Creates an agreement and increments numAgreements
     @param rate : The lender's desired interest rate % (i.e. 5%)
     @param period : The lender's desired lending period in years (i.e. 5 years)
     @param deposit : The lender's initial deposit amount in USDC bits (i.e. 1000000 = 1 USDC) 
     @return newId : The id of the newly created agreement
    */
    function createAgreement(
        uint256 rate,
        uint256 period,
        uint256 deposit
    ) public payable returns (uint256 newId) {
        // require USDC value sent == deposit
        /// TODO
        /* create Agreement with deposit, rate, period, msg.sender=lender, status=pending */
        /// TODO
        // transfer usdc from sender to contract
        /// TODO
        return 0;
    }

    /**
      @notice Activates a pending agreement and changes its status to active
      @param id : The agreement's id,
      @param collateral : The required collateral that the sender is sending denominated in WEI
      @return success : Indicates whether the function ran successfully 
    */
    function activateAgreement(uint256 id, uint256 collateral)
        public
        payable
        returns (bool success)
    {
        // require collateral value in usd > agreement.deposit*1.5. call calcReqCollateral(id)
        /// TODO
        // update agreement with collateral, borrower=msg.sender, status=active
        /// TODO
        // transfer agreement.deposit usdc to borrower
        /// TODO
        return true;
    }

    /**
     @notice Adds more collateral to a specific Agreement
     @param id : The agreement id
     @param amount : The extra collateral amount that's being added demoninated in WEI
     @return success : Indicates whether successful or not
    */
    function addCollateral(uint256 id, uint256 amount)
        public
        payable
        returns (bool success)
    {
        // require amount == msg.value
        /// TODO
        // update agreement.collateral += amount
        // TODO
        // transfer amount wei to contract
        /// TODO
        return true;
    }

    /**
     @notice Withdraws ETH collateral from an Agreement up to the liquidation threshold
     @dev Only the borrower can call this
     @param id : The agreement id
     @param amount : The requested withdraw amount in WEI
     @return success : Indicates whether successful or not
    */
    function withdrawCollateral(uint256 id, uint256 amount)
        public
        returns (bool success)
    {
        // require msg.sender==agreement.borrower
        /// TODO
        // require that the potential withdraw amt still leaves the agreement w/enough collateral
        /// TODO
        // transfer amount wei to sender
        /// TODO
        return true;
    }

    /**
     @notice Lets the borrower pay off some or all of their loan with USDC at any time. Updates the agreement. 
     @param id : The agreement's id
     @param amount : The amount they want to pay off in USDC bits
     @return success : Indicates whether successful or not
    */
    function payBackLoan(uint256 id, uint256 amount)
        public
        payable
        returns (bool success)
    {
        // require sent usdc value == amount
        /// TODO
        // update agreement with paidBackAmt += amount
        /// TODO
        // transfer usdc from sender to contract
        /// TODO
        // if paidBackAmt >= deposit --> agreement.status=PaidFor
        /// TODO
        return true;
    }

    /**
     @notice Ends an agreement for the lender and send the appreciated value of USDC back to their address. Updates agreement and changes it's status to terminated.
     @dev -Only lender can call this!
          -Elapsed time since start must be > the agreement's period
     @param id : The agreement's id
     @return success : Indicated whether successful or not
    */
    function terminateAgreement(uint256 id) public returns (bool success) {
        // require msg.sender == agreement.lender
        /// TODO
        // require time.now - agreement.start > agreement.period
        /// TODO
        // assert agreement.status == PaidFor
        /// TODO
        return true;
    }

    /**
     @notice Calculates the required WEI collateral for a specific agreement by multiplying the agreement's USDC deposit by 1.5 and converting to the current value of necessary WEI
     @param id : The agreement's id
     @return reqWEI : The required WEI collateral needed
    */
    function calcReqCollateral(uint256 id) public returns (uint256 reqWEI) {
        // get price of ETH in USDC using chainlink price feed
        /// TODO
        // use eth price to calculate required wei for 1.5*agreement.deposit, the liquidation threshold. return it.
        /// TODO
        return 0;
    }

    // PRIVATE FUNCTIONS
    /**
     @notice Liquidates an agreement if necessary. Called via Chainlink keepers
     @param id : The agreement id
     @return success : Indicates whether the agreement could successfully be liquidated
    */
    function liquidateAgreement(uint256 id) private returns (bool success) {
        // assert that the agreement either doesn't have enough collateral or that it hasn't been paid back yet by the borrower and the time period is up.
        /// TODO
        // use uniswap to convert the eth collateral to usdc
        /// TODO
        // transfer excess eth back to borrower
        /// TODO
        // update agreement status to PaidFor
        /// TODO
        return true;
    }

    // EXTERNAL FUNCTIONS
    /**
      @notice Runs off-chain at every block to determine if the performUpkeep function should be called on-chain.
      @return upkeepNeeded : Boolean that when True will trigger the on-chain performUpkeep call.
      @return performData : Bytes that will be used as input parameter when calling performUpkeep. If you would like to encode data to decode later, try abi.encode
    */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // build a list of agreements that need to be liquidated. Liquidation is necessary if there isn't enough collateral or the loan hasn't been paid back yet by the borrower and the agreement's period expired.
        /// TODO
        // encode and return the list as performData
        /// TODO
    }

    /**
      @notice Contains the logic that should be executed on-chain when checkUpkeep returns true.
      @param performData : Data which was passed back from the checkData simulation. If it is encoded, it can easily be decoded into other types by calling abi.decode. This data should always be validated against the contract's current state.
    */
    function performUpkeep(bytes calldata performData) external override {
        // use performData to liquidate the agreements
        /// TODO
    }
}
