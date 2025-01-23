// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimplePaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;
    uint256 private constant COST_OF_POST_OP = 40000;

    constructor(address _entryPoint) Ownable(msg.sender) {
        entryPoint = IEntryPoint(_entryPoint);
    }

    function depositTo() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData) {
        // Decode additional context from paymasterAndData
        (address sender, uint256 validUntil) = abi.decode(
            userOp.paymasterAndData[20:],
            (address, uint256)
        );

        // Basic validation
        require(sender == userOp.sender, "Sender mismatch");
        require(
            validUntil >= block.timestamp,
            "Paymaster authorization expired"
        );

        // Return context for post-op and 0 as valid validation data
        return (abi.encode(sender, validUntil), 0);
    }

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        // Post-operation logic if needed
    }

    function getPaymasterData(
        address sender,
        uint256 validUntil
    ) external view returns (bytes memory) {
        return abi.encodePacked(address(this), abi.encode(sender, validUntil));
    }

    receive() external payable {}

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external override {}
}