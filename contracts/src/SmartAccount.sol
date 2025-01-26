// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "lib/webauthn-sol/src/WebAuthn.sol";

contract SmartAccount is IAccount, UUPSUpgradeable, Initializable {
    using ECDSA for bytes32;
    
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error SmartAccount__NotFromEntryPoint();
    error SmartAccount__NotFromEntryPointOrOwner();
    error SmartAccount__CallFailed(bytes);
    error SmartAccount__AlreadyInitialized();
    error SmartAccount__InvalidSignatureLength();
    error SmartAccount__InvalidOwner();
    error SmartAccount__InvalidSignature();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IEntryPoint private immutable i_entryPoint;

    // Owner's WebAuthn public key components
    uint256 public ownerPubKeyX;
    uint256 public ownerPubKeyY;

    // Session keys with validity
    struct SessionKeyData {
        uint256 validUntil;
        bool isValid;
    }

    mapping(address => SessionKeyData) public sessionKeys;
    uint256 public constant SESSION_VALIDITY = 1 days;

    event SessionKeyCreated(address indexed key, uint256 validUntil);
    event Initialized(uint256 pubKeyX, uint256 pubKeyY);

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
        if (msg.sender != address(i_entryPoint) && !_isOwner(msg.sender)) {
            revert SmartAccount__NotFromEntryPointOrOwner();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor(address entryPoint) {
        i_entryPoint = IEntryPoint(entryPoint);
        _disableInitializers();
    }

    function initialize(
        uint256 _ownerPubKeyX,
        uint256 _ownerPubKeyY
    ) public initializer {
        ownerPubKeyX = _ownerPubKeyX;
        ownerPubKeyY = _ownerPubKeyY;
        emit Initialized(_ownerPubKeyX, _ownerPubKeyY);
    }

    receive() external payable {}

    /* //////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////// */

    function execute(
        address dest,
        uint256 value,
        bytes calldata functionData
    ) external requireFromEntryPointOrOwner {
        (bool success, bytes memory result) = dest.call{value: value}(
            functionData
        );
        if (!success) {
            revert SmartAccount__CallFailed(result);
        }
    }

    function createSessionKey(address sessionKeyAddress) external requireFromEntryPointOrOwner {
        
        sessionKeys[sessionKeyAddress] = SessionKeyData({
            validUntil: block.timestamp + SESSION_VALIDITY,
            isValid: true
        });

        emit SessionKeyCreated(sessionKeyAddress, sessionKeys[sessionKeyAddress].validUntil);
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external requireFromEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOp, userOpHash);
        // _payPrefund(missingAccountFunds);
        //  validationData = 0;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        (bool isSessionKey, bytes memory signature) = abi.decode(userOp.signature, (bool, bytes));
        
        if (isSessionKey) {
            // For session keys, recover address from ECDSA signature and verify validity
            bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
            address recoveredAddress = hash.recover(signature);
            
            SessionKeyData memory sessionData = sessionKeys[recoveredAddress];
            if (sessionData.isValid && sessionData.validUntil > block.timestamp) {
                return 0;
            }
            return SIG_VALIDATION_FAILED;
        } else {
            // Owner signature validation using WebAuthn
            WebAuthn.WebAuthnAuth memory auth = abi.decode(signature, (WebAuthn.WebAuthnAuth));
            bool isValidOwner = WebAuthn.verify({
                challenge: abi.encode(userOpHash),
                requireUV: false,
                webAuthnAuth: auth,
                x: ownerPubKeyX,
                y: ownerPubKeyY
            });
            return isValidOwner ? 0 : SIG_VALIDATION_FAILED;
        }
    }

    function _isOwner(address caller) internal view returns (bool) {
        // Create deterministic address from owner's public key
        address ownerAddress = address(
            uint160(
                uint256(keccak256(abi.encodePacked(ownerPubKeyX, ownerPubKeyY)))
            )
        );
        return caller == ownerAddress;
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

    function _authorizeUpgrade(address) internal view override {
        if (!_isOwner(msg.sender)) {
            revert SmartAccount__NotFromEntryPointOrOwner();
        }
    }

    /*//////////////////////////////////////////////////////////////
                                GETTERS
    //////////////////////////////////////////////////////////////*/
    function getEntryPoint() external view returns (address) {
        return address(i_entryPoint);
    }
}