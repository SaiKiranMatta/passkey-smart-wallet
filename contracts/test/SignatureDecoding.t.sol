// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

contract DecodeExampleTest is Test {
    struct EncodedSignature {
        bool isSessionKey;
        bytes signature;
    }

    function testDecodeSignature() public {
        // Hardcoded values for testing
        bool expectedIsSessionKey = false;
        bytes
            memory expectedSignature = hex"000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000001700000000000000000000000000000000000000000000000000000000000000018649a24b765bd7ee08a9de07f17fd1fb6f81d5255ef3a8252799baa618d161e1577561c726861409ecaf687eaca2da16e79559389242695986ac8eb6c670a795000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000867b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a223961516e4f5f6f4f6938356433416355646c384c4c41516a486e72703438756b78514a4766366e36776441222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303030222c2263726f73734f726967696e223a66616c73657d0000000000000000000000000000000000000000000000000000";

        // Manually encoding the tuple (bool, bytes) for testing
        bytes memory encodedSignature = abi.encode(
            expectedIsSessionKey,
            expectedSignature
        );
        // bytes memory encodedSignature = hex"";
        console2.logBytes(encodedSignature);

        // Decode the encoded data
        (bool isSessionKey, bytes memory signature) = abi.decode(
            encodedSignature,
            (bool, bytes)
        );

        // Assert that the decoded values match the expected ones
        assertEq(
            isSessionKey,
            expectedIsSessionKey,
            "isSessionKey does not match"
        );
        assertEq(signature, expectedSignature, "Signature does not match");

        uint256 x = 0xc6a2aeced348c23c6eddc596f6c787fbc99a828d6d3f657d1144b48844eb77a9;
        uint256 y = 0xd65b4d03e966b1d6d3c44e92bb9e68b82e0222718b8095d0d94c0b67ccfc9440;
        bytes
            memory webAuthnPubKey = hex"c6a2aeced348c23c6eddc596f6c787fbc99a828d6d3f657d1144b48844eb77a9d65b4d03e966b1d6d3c44e92bb9e68b82e0222718b8095d0d94c0b67ccfc9440";
        (uint256 pubKeyX, uint256 pubKeyY) = abi.decode(
            webAuthnPubKey,
            (uint256, uint256)
        );
        console2.logBytes(webAuthnPubKey);
        console2.log(pubKeyX);
        console2.log(pubKeyY);
        assertEq(pubKeyX, x, "pubKeyX does not match");
        assertEq(pubKeyY, y, "pubKeyY does not match");
    }
}
