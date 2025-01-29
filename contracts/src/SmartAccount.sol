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

    address public owner;
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
    
     modifier requireFromOwner() {
        _onlyOwner();
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
        uint256 _ownerPubKeyY,
        address _ownerAddress
    ) public initializer {
        ownerPubKeyX = _ownerPubKeyX;
        ownerPubKeyY = _ownerPubKeyY;
        owner = _ownerAddress;
        emit Initialized(_ownerPubKeyX, _ownerPubKeyY);
    }

    receive() external payable {}

    /* //////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////// */

    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external requireFromEntryPointOrOwner {
        _call(dest, value, func);
    }

    function createSessionKey(address sessionKeyAddress) external requireFromOwner {
        sessionKeys[sessionKeyAddress] = SessionKeyData({
            validUntil: block.timestamp + SESSION_VALIDITY,
            isValid: true
        });

        emit SessionKeyCreated(
            sessionKeyAddress,
            sessionKeys[sessionKeyAddress].validUntil
        );
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external requireFromEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOp.signature, userOpHash);
        _payPrefund(missingAccountFunds);
        //  validationData = 0;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _validateSignature(
        bytes calldata encodedSignature,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        (bool isSessionKey, bytes memory signature) = abi.decode(
            encodedSignature,
            (bool, bytes)
        );

        if (isSessionKey) {
            // For session keys, recover address from signature and verify validity
            address recoveredAddress = ECDSA.recover(userOpHash, signature);

            SessionKeyData memory sessionData = sessionKeys[recoveredAddress];
            if (
                sessionData.isValid && sessionData.validUntil > block.timestamp
            ) {
                return 0;
            }
            return SIG_VALIDATION_FAILED;
        } else {
            // Owner signature validation using WebAuthn
            WebAuthn.WebAuthnAuth memory auth = abi.decode(
                signature,
                (WebAuthn.WebAuthnAuth)
            );
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

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == owner || msg.sender == address(this), "only owner");
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

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            revert SmartAccount__CallFailed(result);
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
