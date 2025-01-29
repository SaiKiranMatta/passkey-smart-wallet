// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import "lib/webauthn-sol/src/WebAuthn.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract WebAuthnSignatureTest is Test {
    function test_WebAuthnSignatureVerification() public view {
        // Hardcoded UserOp Hash
        bytes32 userOpHash = 0xf5a4273bfa0e8bce5ddc0714765f0b2c04231e7ae9e3cba4c502467fa9fac1d0;

        bytes
            memory encodedSignature = hex"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000001700000000000000000000000000000000000000000000000000000000000000018649a24b765bd7ee08a9de07f17fd1fb6f81d5255ef3a8252799baa618d161e1577561c726861409ecaf687eaca2da16e79559389242695986ac8eb6c670a795000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000867b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a223961516e4f5f6f4f6938356433416355646c384c4c41516a486e72703438756b78514a4766366e36776441222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303030222c2263726f73734f726967696e223a66616c73657d0000000000000000000000000000000000000000000000000000";

        (bool isSessionKey, bytes memory signature) = abi.decode(
            encodedSignature,
            (bool, bytes)
        );
        assertTrue(isSessionKey == false);
        console2.logBytes(signature);
        console2.logBool(isSessionKey);
        // assertTrue(isSessionKey == false);
        // Hardcoded Public Key X and Y coordinates
        uint256 x = 0xc6a2aeced348c23c6eddc596f6c787fbc99a828d6d3f657d1144b48844eb77a9;
        uint256 y = 0xd65b4d03e966b1d6d3c44e92bb9e68b82e0222718b8095d0d94c0b67ccfc9440;

        // Hardcoded WebAuthn Signature Components
        WebAuthn.WebAuthnAuth memory auth = abi.decode(
            signature,
            (WebAuthn.WebAuthnAuth)
        );

        // Attempt WebAuthn verification
        bool isValidOwner = WebAuthn.verify({
            challenge: abi.encode(userOpHash),
            requireUV: false,
            webAuthnAuth: auth,
            x: x,
            y: y
        });

        // Assert the verification result
        assertTrue(isValidOwner, "WebAuthn signature verification should pass");
    }

    function test_SessionkeySignatureVerification() public pure {
        // Hardcoded UserOp Hash
        bytes32 userOpHash = 0x59c96c5be65455d12f5e4a0b9576f8af0b6283c04f45f38ab949d50600b32117;

        bytes
            memory encodedSignature = hex"000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041eb8af9283e2da74162d7b4b3e18921e5a15333f1caa9d828cecb7d2e83c95a2622f66c299666b300cd4d4d3894e45fc33670db58e346c02ff471b6b6f3583d911c00000000000000000000000000000000000000000000000000000000000000";

        (bool isSessionKey, bytes memory signature) = abi.decode(
            encodedSignature,
            (bool, bytes)
        );
        assertTrue(isSessionKey == true);

        
        address recoveredAddress = ECDSA.recover(userOpHash, signature);

        console2.logAddress(recoveredAddress);

        assertTrue(recoveredAddress == address(0xe87b03B5c0aE65BF88323644E92E987d30FCCA6E), "Session key signature verification should pass");

    }
}
