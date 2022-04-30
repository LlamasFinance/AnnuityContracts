//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

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

    modifier onlyLender(uint256 agreementId) {
        require(
            agreements[agreementId].lender == msg.sender,
            "Only lender can call this"
        );
        _;
    }

    modifier onlyIfRepaid(uint256 agreementId) {
        require(
            agreements[agreementId].status == Status.Repaid,
            "Only available to call if borrower fully repaid"
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

    modifier onlyBorrower(uint256 agreementId) {
        require(
            agreements[agreementId].borrower == msg.sender,
            "Only borrower can call this"
        );
        _;
    }
}
