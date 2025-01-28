import { PackedUserOperation } from "viem/account-abstraction";

export const convertBigIntToHex = (value: bigint | string): string => {
    if (typeof value === 'bigint') {
      return `0x${value.toString(16)}`;
    }
    return value;
  };

 export const toSerializablePackedUserOp = (userOp: PackedUserOperation) => {
    return {
      sender: userOp.sender,
      nonce: convertBigIntToHex(userOp.nonce),
      callData: userOp.callData,
      initCode: userOp.initCode,
      gasFees: convertBigIntToHex(userOp.gasFees),
      accountGasLimits: userOp.accountGasLimits,
      preVerificationGas: convertBigIntToHex(userOp.preVerificationGas),
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature,
    };
  };