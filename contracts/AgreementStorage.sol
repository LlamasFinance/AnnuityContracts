//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AgreementStorage
 * @author Team
 * @notice It defines the storage layout of the Annuity contract
 **/
contract AgreementStorage {
    enum Status {
        Pending,
        Active,
        Repaid,
        Closed
    }

    struct Agreement {
        uint256 deposit;
        uint256 collateral;
        uint256 repaidAmt;
        uint256 start;
        uint256 duration;
        uint256 rate;
        Status status;
        address payable lender;
        address payable borrower;
    }

    mapping(uint256 => Agreement) public agreements;
    uint256 public numAgreements;

    // temporary addresses, these will later be set in constructor.
    address public constant _WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant _USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant _swapRouter =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;

    modifier onlyLender(uint256 agreementId) {
        require(
            agreements[agreementId].lender == msg.sender,
            "Only lender can call this"
        );
        _;
    }

    modifier onlyIfActive(uint256 agreementId) {
        require(
            agreements[agreementId].status == Status.Active,
            "Only available to call if agreement is active"
        );
        _;
    }

    modifier onlyIfPending(uint256 agreementId) {
        require(
            agreements[agreementId].status == Status.Pending,
            "Only available to call if agreement is pending"
        );
        _;
    }

    modifier onlyIfRepaid(uint256 agreementId) {
        require(
            agreements[agreementId].status == Status.Repaid,
            "Only available to call if agreement is repaid"
        );
        _;
    }

    modifier onlyIfClosed(uint256 agreementId) {
        require(
            agreements[agreementId].status == Status.Closed,
            "Only available to call if agreement is closed"
        );
        _;
    }

    modifier onlyBorrower(uint256 agreementId) {
        require(
            agreements[agreementId].borrower == msg.sender,
            "Only borrower can call this"
        );
        _;
    }
}
