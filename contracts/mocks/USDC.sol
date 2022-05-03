//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor(uint256 amountToMint) ERC20("USDC", "USDC") {
        _mint(msg.sender, amountToMint);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // function approve(address spender, uint256 amount)
    //     public
    //     override
    //     returns (bool)
    // {
    //     address owner = _msgSender();
    //     _approve(owner, spender, amount);
    //     return true;
    // }

    // function _spendAllowance(
    //     address owner,
    //     address spender,
    //     uint256 amount
    // ) internal override {
    //     uint256 currentAllowance;
    //     if (owner == spender) {
    //         currentAllowance = balanceOf(owner);
    //     } else {
    //         currentAllowance = allowance(owner, spender);
    //     }
    //     if (currentAllowance != type(uint256).max) {
    //         require(
    //             currentAllowance >= amount,
    //             "ERC20: insufficient allowance"
    //         );
    //         unchecked {
    //             _approve(owner, spender, currentAllowance - amount);
    //         }
    //     }
    // }
}
