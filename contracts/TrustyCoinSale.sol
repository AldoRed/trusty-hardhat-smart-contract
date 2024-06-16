// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TrustyCoinSale is Ownable {
    // State variables
    IERC20 public trustyCoin;
    // Number of TrustyCoins per 1 ETH
    uint256 public rate;

    // Events
    event TokensPurchased(address indexed purchaser, uint256 amount);

    // Constructor
    constructor(IERC20 _trustyCoin, uint256 _rate) {
        trustyCoin = _trustyCoin;
        rate = _rate;
    }

    // Public Functions
    function buyTokens() public payable {
        uint256 tokenAmount = msg.value * rate;
        require(
            trustyCoin.balanceOf(address(this)) >= tokenAmount,
            "Not enough tokens available"
        );

        trustyCoin.transfer(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount);
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawTokens() public onlyOwner {
        trustyCoin.transfer(owner(), trustyCoin.balanceOf(address(this)));
    }
}
