// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error TrustyCoinSale__NoFunds();

contract TrustyCoinSale is Ownable {
    // State variables
    IERC20 private immutable i_trustyCoin;
    // Number of TrustyCoins per 1 ETH
    uint256 private immutable i_rate;

    // Events
    event TokensPurchased(address indexed purchaser, uint256 amount);

    // Constructor
    constructor(IERC20 _trustyCoin, uint256 _rate) {
        i_trustyCoin = _trustyCoin;
        i_rate = _rate;
    }

    // Public Functions
    function buyTokens() public payable {
        uint256 tokenAmount = msg.value * i_rate;
        require(
            i_trustyCoin.balanceOf(address(this)) >= tokenAmount,
            "Not enough tokens available"
        );

        i_trustyCoin.transfer(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount);
    }

    function withdraw() public onlyOwner {
        if (address(this).balance == 0) revert TrustyCoinSale__NoFunds();
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawTokens() public onlyOwner {
        if (i_trustyCoin.balanceOf(address(this)) == 0)
            revert TrustyCoinSale__NoFunds();
        i_trustyCoin.transfer(owner(), i_trustyCoin.balanceOf(address(this)));
    }

    function getRate() public view returns (uint256) {
        return i_rate;
    }
}
