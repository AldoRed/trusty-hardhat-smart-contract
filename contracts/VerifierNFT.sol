//VerifierNFT
//Step by step until a verification is completed:
//1. User calls requestVerification with the tokenURI of the NFT and pays the verificationFee in TrustCoin.
//2. The contract stores the request in the verificationRequests mapping.
//3. The contract emits the VerificationRequested event.
//4. The authorized partner calls validateByPartner to validate the request.
//5. The contract emits the VerificationValidatedByPartner event.
//6. The contract checks if the request has been completed or if the time limit has been reached.
//7. If the request is completed, the contract mints a new NFT and assigns it to the user.
//8. If the request was verified by the authorized partner, the partner recieves 50% of the verificationFee.
//9. If the request was not verified by the authorized partner, the contract owner recieves the full verificationFee.
//10. If the request was not completed, the contract owner can reject the request and refund 50% of the verificationFee to the user.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the ERC721URIStorage contract NFT
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

error VerifierNFT__AlreadyUnauthorizedPartner();
error VerifierNFT__AlreadyAuthorizedPartner();
error VerifierNFT__OnlyAuthorizedPartner();
error VerifierNFT__TheRequestIsCompleted();
error VerifierNFT__TheRequestIsRejected();
error VerifierNFT__TheCallerIsNotAuthorizedToReject();

/**
 * @title The VerifierNFT contract
 * @author Aldo Munoz
 * @notice ERC721 token for VerifierNFT
 * @dev The contract uses the Chainlink Automation library to perform upkeeps
 */
contract VerifierNFT is ERC721URIStorage, AutomationCompatible, Ownable {
    // Type declaration
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct VerificationRequest {
        address user;
        string tokenURI;
        uint256 requestTime;
        bool completed;
        bool rejected;
        bool authorizedPartnerValidated;
        address authorizedPartner;
    }

    // State variables
    IERC20 private immutable i_trustyCoin;
    uint256 private immutable i_verificationFee;

    uint256 private constant TIME_LIMIT = 5 days;
    mapping(uint256 => VerificationRequest) private s_verificationRequests;
    mapping(address => bool) private s_authorizedPartners;
    uint256 private s_requestCounter;

    // Events
    event VerificationRequested(uint256 requestId, address indexed user);
    event VerificationCompleted(
        uint256 requestId,
        address indexed user,
        uint256 tokenId
    );
    event VerificationValidatedByPartner(
        uint256 requestId,
        address indexed partner
    );
    event VerificationRejected(
        uint256 requestId,
        address indexed user,
        address indexed partner
    );

    // Modifiers
    modifier onlyAuthorizedPartner() {
        if (!s_authorizedPartners[msg.sender])
            revert VerifierNFT__OnlyAuthorizedPartner();
        _;
    }

    // Constructor
    constructor(
        address trustyCoinAddress,
        uint256 _verificationFee
    ) ERC721("VerifierNFT", "VNFT") {
        i_trustyCoin = IERC20(trustyCoinAddress);
        i_verificationFee = _verificationFee * 10 ** 18;
    }

    function addAuthorizedPartner(address partner) external onlyOwner {
        if (s_authorizedPartners[partner])
            revert VerifierNFT__AlreadyAuthorizedPartner();
        s_authorizedPartners[partner] = true;
    }

    function removeAuthorizedPartner(address partner) external onlyOwner {
        if (!s_authorizedPartners[partner])
            revert VerifierNFT__AlreadyUnauthorizedPartner();
        s_authorizedPartners[partner] = false;
    }

    function checkUpkeep(
        bytes calldata
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = false;
        uint256[] memory pendingRequests = new uint256[](s_requestCounter);
        uint256 pendingCount = 0;

        for (uint256 i = 1; i <= s_requestCounter; i++) {
            if (
                !s_verificationRequests[i].completed &&
                !s_verificationRequests[i].rejected &&
                (block.timestamp >=
                    s_verificationRequests[i].requestTime + TIME_LIMIT ||
                    s_verificationRequests[i].authorizedPartnerValidated)
            ) {
                pendingRequests[pendingCount] = i;
                pendingCount++;
                upkeepNeeded = true;
            }
        }

        performData = abi.encode(pendingRequests, pendingCount);
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory pendingRequests, uint256 pendingCount) = abi.decode(
            performData,
            (uint256[], uint256)
        );

        for (uint256 i = 0; i < pendingCount; i++) {
            completeVerification(pendingRequests[i]);
        }
    }

    function requestVerification(
        string memory tokenURI,
        address authorizedPartner
    ) public {
        require(
            i_trustyCoin.transferFrom(
                msg.sender,
                address(this),
                i_verificationFee
            ),
            "Payment failed"
        );

        s_requestCounter++;
        s_verificationRequests[s_requestCounter] = VerificationRequest({
            user: msg.sender,
            tokenURI: tokenURI,
            requestTime: block.timestamp,
            completed: false,
            rejected: false,
            authorizedPartnerValidated: false,
            authorizedPartner: authorizedPartner
        });

        emit VerificationRequested(s_requestCounter, msg.sender);
    }

    function validateByPartner(uint256 requestId) public onlyAuthorizedPartner {
        VerificationRequest storage request = s_verificationRequests[requestId];
        if (request.completed) revert VerifierNFT__TheRequestIsCompleted();
        request.authorizedPartnerValidated = true;
        request.authorizedPartner = msg.sender;

        emit VerificationValidatedByPartner(requestId, msg.sender);
    }

    function rejectVerification(uint256 requestId) public {
        VerificationRequest storage request = s_verificationRequests[requestId];
        if (request.completed) revert VerifierNFT__TheRequestIsCompleted();
        if (request.rejected) revert VerifierNFT__TheRequestIsRejected();
        if (msg.sender != owner() && !s_authorizedPartners[msg.sender])
            revert VerifierNFT__TheCallerIsNotAuthorizedToReject();

        request.rejected = true;

        // Refund the verification 50% fee to the user
        require(
            i_trustyCoin.transfer(request.user, i_verificationFee / 2),
            "Token refund failed"
        );
        require(
            i_trustyCoin.transfer(owner(), i_verificationFee / 2),
            "Token refund failed"
        );

        emit VerificationRejected(requestId, request.user, msg.sender);
    }

    function completeVerification(uint256 requestId) internal {
        VerificationRequest storage request = s_verificationRequests[requestId];
        require(!request.completed, "Verification already completed");
        require(!request.rejected, "Verification was rejected");
        require(
            block.timestamp >= request.requestTime + TIME_LIMIT ||
                request.authorizedPartnerValidated,
            "Time limit not reached and not validated by partner"
        );

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(request.user, newItemId);
        _setTokenURI(newItemId, request.tokenURI);

        request.completed = true;

        emit VerificationCompleted(requestId, request.user, newItemId);

        // Transfer tokens to the authorized partner if the verification was validated by a partner
        if (request.authorizedPartnerValidated) {
            require(
                i_trustyCoin.transfer(
                    request.authorizedPartner,
                    i_verificationFee / 2
                ),
                "Payment failed"
            );
            require(
                i_trustyCoin.transfer(owner(), i_verificationFee / 2),
                "Payment failed"
            );
        } else {
            require(
                i_trustyCoin.transfer(owner(), i_verificationFee),
                "Payment failed"
            );
        }
    }

    //View/Pure functions
    function getVerificationRequest(
        uint256 requestId
    ) public view returns (VerificationRequest memory) {
        return s_verificationRequests[requestId];
    }

    function getVerificationFee() public view returns (uint256) {
        return i_verificationFee;
    }

    function getAuthorizedPartner(address partner) public view returns (bool) {
        return s_authorizedPartners[partner];
    }

    function getRequestCounter() public view returns (uint256) {
        return s_requestCounter;
    }

    function getTrustyCoin() public view returns (IERC20) {
        return i_trustyCoin;
    }

    function getTimeLimit() public pure returns (uint256) {
        return TIME_LIMIT;
    }
}
