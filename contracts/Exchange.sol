// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

enum Status {
    Pending,
    Active,
    Repaid,
    Closed
}

struct Agreement {
    uint256 deposit; // in lender's token
    uint256 collateral; // in eth
    uint256 repaidAmt; // in lender's token
    uint256 futureValue; // deposit * 1+(rate/100) * duration
    uint256 start; // in seconds
    uint256 duration; // in years
    uint256 rate; // 0-99, using one decimal place. Eg. 99 is 9.9
    Status status;
    address payable lender;
    address payable borrower;
}

error TransferFailed();
error NeedsMoreThanZero();

contract Exchange is ReentrancyGuard, Ownable {
    mapping(uint256 => Agreement) public s_idToAgreement;
    mapping(address => uint256[]) public s_accountToIDs;
    uint256 public s_numIDs;
    IERC20 public s_lenderToken;
    AggregatorV3Interface public s_priceFeed;

    // At 80% Loan to Value Ratio, the loan can be liquidated
    uint256 public constant LIQUIDATION_THRESHOLD = 80;

    event Propose(
        address indexed lender,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Activate(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event AddCollateral(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Repay(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Repaid(
        address indexed lender,
        uint256 indexed id,
        uint256 indexed amount
    );
    event WithdrawCollateral(
        address indexed borrower,
        uint256 indexed id,
        uint256 indexed amount
    );
    event Closed(
        address indexed lender,
        address indexed borrower,
        uint256 indexed id
    );
    event Liquidate(address indexed borrower, uint256 remainingValue);

    function propose(
        uint256 amount,
        uint256 duration,
        uint256 rate
    ) external nonReentrant moreThanZero(amount) returns (uint256 id) {
        uint256 futureValue = (amount * (100 + rate) * duration) / 100;
        Agreement memory newAgreement = Agreement({
            deposit: amount,
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
        bool success = s_lenderToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        s_numIDs++;
        id = s_numIDs;
        s_idToAgreement[id] = newAgreement;
        s_accountToIDs[msg.sender].push(id);
        emit Propose(msg.sender, id, amount);
    }

    function activate(uint256 id, uint256 amount)
        external
        payable
        nonReentrant
        moreThanZero(msg.value)
    {}

    function getEthValue(uint256 amount) public view returns (uint256) {
        (, int256 price, , , ) = s_priceFeed.latestRoundData();
        // price has 8 decimals
        // price will be something like 300000000000
        return (uint256(price) * amount) * (10**(18 - 8));
    }

    /********************/
    /* Modifiers */
    /********************/
    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert NeedsMoreThanZero();
        }
        _;
    }

    /********************/
    /* DAO / OnlyOwner Functions */
    /********************/
    function setLenderToken(address token, address priceFeed)
        external
        onlyOwner
    {
        s_lenderToken = IERC20(token);
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }
}