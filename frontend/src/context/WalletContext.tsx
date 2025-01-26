"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createPublicClient,
  http,
  type Address,
  createWalletClient,
  encodeFunctionData,
  concat,
  pad,
  numberToHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { type CreateWebAuthnCredentialReturnType } from "viem/account-abstraction";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { toGardenSmartAccount } from "@/utils/toGardenSmartAccount";

// ABI for the createSessionKey function
const CREATE_SESSION_KEY_ABI = {
  inputs: [{ name: "sessionKeyAddress", type: "address" }],
  name: "createSessionKey",
  outputs: [],
  stateMutability: "nonpayable",
  type: "function",
} as const;

interface WalletContextType {
  smartAccount: any;
  credential: CreateWebAuthnCredentialReturnType | null;
  accountAddress: string | null;
  isLoading: boolean;
  error: string | null;
  sessionKey: any | null;
  initializeWallet: (
    email: string,
    credential: CreateWebAuthnCredentialReturnType
  ) => Promise<void>;
  createSessionKey: () => Promise<void>;
  signMessage: (message: string) => Promise<void>;
  sendUserOperation: (
    to: Address,
    value?: bigint,
    data?: `0x${string}`
  ) => Promise<any>;
  logout: () => void;
}

interface StoredCredential {
  email: string;
  credential: CreateWebAuthnCredentialReturnType;
  accountAddress: string;
}

const storeCredential = (
  email: string,
  credential: CreateWebAuthnCredentialReturnType,
  accountAddress: string
) => {
  // Store in local storage for persistence
  const storedCredentials = JSON.parse(
    localStorage.getItem("stored_credentials") || "[]"
  );
  const newCredential: StoredCredential = {
    email,
    credential,
    accountAddress,
  };
  // Check if email already exists and update if it does
  const existingIndex = storedCredentials.findIndex(
    (c: StoredCredential) => c.email === email
  );
  if (existingIndex >= 0) {
    storedCredentials[existingIndex] = newCredential;
  } else {
    storedCredentials.push(newCredential);
  }
  localStorage.setItem("stored_credentials", JSON.stringify(storedCredentials));
  // Store current session
  localStorage.setItem(
    "current_session",
    JSON.stringify({ credential, accountAddress })
  );
};
const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  interface StateType {
    smartAccount: any;
    credential: CreateWebAuthnCredentialReturnType | null;
    accountAddress: string | null;
    isLoading: boolean;
    error: string | null;
    sessionKey: any | null;
  }

  const [state, setState] = useState<StateType>({
    smartAccount: null,
    credential: null,
    accountAddress: null,
    isLoading: false,
    error: null,
    sessionKey: null,
  });

  const bundlerTransport = http("http://localhost:4337");
  const customBundlerTransport = http("http://localhost:4337", {
    retryCount: 3,
    timeout: 30000,
  });

  const bundlerClient = createPublicClient({
    chain: foundry,
    transport: customBundlerTransport,
  });

  const client = createPublicClient({
    chain: foundry,
    transport: http("http://localhost:8545"),
  });

  const initializeWallet = async (
    email: string,
    credential: CreateWebAuthnCredentialReturnType
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const account = toWebAuthnAccount({
        credential,
      });

      const smartAccount = await toGardenSmartAccount({
        client,
        owner: account,
      });

      setState((prev) => ({
        ...prev,
        smartAccount,
        credential,
        accountAddress: smartAccount.address,
        isLoading: false,
      }));

      localStorage.setItem(
        "current_session",
        JSON.stringify({
          email,
          credential,
          accountAddress: smartAccount.address,
        })
      );

      storeCredential(email, credential, smartAccount.address);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Wallet initialization failed",
      }));
    }
  };

  const sendUserOperation = async (
    to: Address,
    value: bigint = 0n,
    data: `0x${string}` = "0x"
  ) => {
    if (!state.smartAccount) {
      throw new Error("Smart account not initialized");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get the current nonce
      const nonce = await state.smartAccount.getNonce();

      // Check if account is deployed
      const isDeployed = await state.smartAccount.isDeployed();

      // Get initCode if account is not deployed
      let initCode: `0x${string}` = "0x";
      if (!isDeployed) {
        const { factory, factoryData } =
          await state.smartAccount.getFactoryArgs();
        initCode = concat([factory, factoryData]) as `0x${string}`;
      }

      // Get the current gas prices
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await client.estimateFeesPerGas();

      // Encode the function call
      const callData = await state.smartAccount.encodeCalls([
        {
          to,
          value,
          data,
        },
      ]);

      const paymasterAddress =
        (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS as `0x${string}`) ?? "0x";

      // Calculate validUntil timestamp (1 hour from now)
      const validUntil = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = Math.floor(Date.now() / 1000) - 3600; // current timestamp

      const paymasterAndData = concat([
        paymasterAddress,
        pad(numberToHex(20000n), { size: 16 }),
        pad(numberToHex(10000n), { size: 16 }),
        pad(numberToHex(validUntil), { size: 32 }),
        pad(numberToHex(validAfter), { size: 32 }),
      ]);

      // Create the user operation with proper structure
      const MAX_UINT120 = BigInt("0xffffffffffffffffffffffffffff");

      const userOperation = {
        sender: state.smartAccount.address,
        nonce: BigInt(nonce),
        initCode,
        callData,
        callGasLimit: 10000n,
        verificationGasLimit: 200000n,
        preVerificationGas: 20000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature: "0x",
      } as const;

      const gasValues = [
        userOperation.preVerificationGas,
        userOperation.verificationGasLimit,
        userOperation.callGasLimit,
        userOperation.maxFeePerGas,
        userOperation.maxPriorityFeePerGas,
      ];

      gasValues.forEach((value) => {
        if (value > MAX_UINT120) {
          throw new Error(`Gas value ${value} exceeds uint120 max`);
        }
      });

      //wait 2 seconds before signing the transaction to prevent the webauth failing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Sign the user operation
      const signature = await state.smartAccount.signUserOperation(
        userOperation
      );

      const accountGasLimits = concat([
        pad(numberToHex(userOperation.verificationGasLimit), { size: 16 }),
        pad(numberToHex(userOperation.callGasLimit), { size: 16 }),
      ]);
      const gasFees = concat([
        pad(numberToHex(userOperation.maxPriorityFeePerGas), { size: 16 }),
        pad(numberToHex(userOperation.maxFeePerGas), { size: 16 }),
      ]);

      // Structure the signed operation
      const formattedUserOp = {
        sender: userOperation.sender,
        nonce: userOperation.nonce,
        initCode: userOperation.initCode,
        callData: userOperation.callData,
        accountGasLimits: accountGasLimits,
        preVerificationGas: userOperation.preVerificationGas,
        gasFees: gasFees,
        paymasterAndData: userOperation.paymasterAndData,
        signature: signature,
      };

      const tempBundlerAccount = privateKeyToAccount(
        "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
      );
      const bundlerAddress = tempBundlerAccount.address;

      // Create wallet client
      const walletClient = createWalletClient({
        account: tempBundlerAccount,
        chain: foundry,
        transport: http("http://localhost:8545"),
      });

      // Send the transaction
      const hash = await walletClient.writeContract({
        address: state.smartAccount.entryPoint.address,
        abi: state.smartAccount.entryPoint.abi,
        functionName: "handleOps",
        args: [[formattedUserOp], bundlerAddress],
      });

      // Wait for the transaction to be mined
      const receipt = await client.waitForTransactionReceipt({ hash });
      return receipt;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to send transaction",
      }));
      throw error;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const createSessionKey = async () => {
    if (!state.smartAccount) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate a new private key for the session
      const privateKey = generatePrivateKey();
      const sessionKey = privateKeyToAccount(privateKey);

      // Encode the createSessionKey function call
      const data = encodeFunctionData({
        abi: [CREATE_SESSION_KEY_ABI],
        functionName: "createSessionKey",
        args: [sessionKey.address],
      });

      // Send the user operation to create session key
      await sendUserOperation(state.smartAccount.address, 0n, data);

      // Update smart account with session key
      const credential = state.credential;
      if (credential) {
        const account = toWebAuthnAccount({ credential });

        const updatedSmartAccount = await toGardenSmartAccount({
          client,
          owner: account,
          sessionKey,
          address: state.smartAccount.address,
        });

        setState((prev) => ({
          ...prev,
          smartAccount: updatedSmartAccount,
          sessionKey,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error("Error creating session key:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Session key creation failed",
      }));
    }
  };

  const signMessage = async (message: string) => {
    if (!state.smartAccount) return;

    try {
      const signature = await state.smartAccount.signMessage({ message });
      console.log(signature);
      return signature;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Signing failed",
      }));
    }
  };

  const logout = () => {
    localStorage.removeItem("current_session");
    setState({
      smartAccount: null,
      credential: null,
      accountAddress: null,
      isLoading: false,
      error: null,
      sessionKey: null,
    });
  };

  useEffect(() => {
    const currentSession = localStorage.getItem("current_session");
    if (currentSession) {
      const { email, credential, accountAddress } = JSON.parse(currentSession);
      initializeWallet(email, credential);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        initializeWallet,
        createSessionKey,
        signMessage,
        sendUserOperation,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
