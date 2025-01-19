// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SmartAccount is IAccount, UUPSUpgradeable, Ownable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error SmartAccount__NotFromEntryPoint();
    error SmartAccount__NotFromEntryPointOrOwner();
    error SmartAccount__CallFailed(bytes);

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IEntryPoint private immutable i_entryPoint;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier requireFromEntryPoint() {
        if (msg.sender != address(i_entryPoint)) {
            revert SmartAccount__NotFromEntryPoint();
        }
        _;
    }

    modifier requireFromEntryPointOrOwner() {
        if (msg.sender != address(i_entryPoint) && msg.sender != owner()) {
            revert SmartAccount__NotFromEntryPointOrOwner();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor(address entryPoint) Ownable(msg.sender) {
        i_entryPoint = IEntryPoint(entryPoint);
    }

    receive() external payable {}

    /* //////////////////////////////////////////////////////////////
    DECLERATIONS 
    ////////////////////////////////////////////////////////////// */

    using ECDSA for bytes32;

    mapping(address => uint256) public sessionKeys;
    uint256 public constant SESSION_VALIDITY = 1 days;

    event SessionKeyCreated(address indexed key, uint256 validUntil);


    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function execute(address dest, uint256 value, bytes calldata functionData) external requireFromEntryPointOrOwner {
        (bool success, bytes memory result) = dest.call{value: value}(functionData);
        if (!success) {
            revert SmartAccount__CallFailed(result);
        }
    }

    // A signature is valid, if it's the SmartAccount owner
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        requireFromEntryPoint
        returns (uint256 validationData)
    {
        validationData = _validateSignature(userOp, userOpHash);
        // _validateNonce()
        _payPrefund(missingAccountFunds);
    }

    function createSessionKey(address sessionKey) external {
        require(msg.sender == owner(), "Only owner can create session keys");
        sessionKeys[sessionKey] = block.timestamp + SESSION_VALIDITY;
        emit SessionKeyCreated(sessionKey, sessionKeys[sessionKey]);
    }



   /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual returns (uint256 validationData) {
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);

        // Check if it's a session key
        address recovered = hash.recover(userOp.signature);
        if (sessionKeys[recovered] > block.timestamp) {
            return 0; // Valid session key
        }

        // Validate passkey signature
        if (recovered == owner()) {
            return 0;
        }

        return SIG_VALIDATION_FAILED;
    }

    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            (success);
        }
    }

    function _authorizeUpgrade(
        address /*newImplementation*/
    ) internal view override {
        require(msg.sender == owner(), "Only owner can upgrade");
    }


    /*//////////////////////////////////////////////////////////////
                                GETTERS
    //////////////////////////////////////////////////////////////*/
    function getEntryPoint() external view returns (address) {
        return address(i_entryPoint);
    }
}
