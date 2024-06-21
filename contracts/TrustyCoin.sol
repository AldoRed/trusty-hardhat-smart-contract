// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title The TrustCoin contract
 * @author Aldo Munoz
 * @notice ERC20 token for TrustCoin
 */
contract TrustyCoin is ERC20 {
    constructor(uint256 initialSupply) ERC20("TrustyCoin", "TCN") {
        _mint(msg.sender, (initialSupply * 10 ** decimals()));
    }
}
