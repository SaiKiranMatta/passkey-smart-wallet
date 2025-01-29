"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createPublicClient,
  http,
  type Address,
  encodeFunctionData,
  concat,
  pad,
  numberToHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import {
  toPackedUserOperation,
  UserOperation,
  type CreateWebAuthnCredentialReturnType,
} from "viem/account-abstraction";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { toGardenSmartAccount } from "@/utils/toGardenSmartAccount";
import { toSerializablePackedUserOp } from "@/utils/conversions";
import { encryptedStorage } from "@/utils/encryptedStorage";

const CREATE_SESSION_KEY_ABI = {
  inputs: [{ name: "sessionKeyAddress", type: "address" }],
  name: "createSessionKey",
  outputs: [],
  stateMutability: "nonpayable",
  type: "function",
} as const;

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL as string;

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
  deleteSessionKey: () => Promise<void>;
  signMessage: (message: string) => Promise<void>;
  sendUserOperation: (
    to: Address,
    value?: bigint,
    data?: `0x${string}`
  ) => Promise<any>;
  logout: () => void;
}

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

  //For gas estimation
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
      const nonce = await state.smartAccount.getNonce();

      const isDeployed = await state.smartAccount.isDeployed();

      const { maxFeePerGas, maxPriorityFeePerGas } =
        await client.estimateFeesPerGas();

      const callData = await state.smartAccount.encodeCalls([
        {
          to,
          value,
          data,
        },
      ]);

      const paymaster =
        (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS as `0x${string}`) ?? "0x";

      const validUntil = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = Math.floor(Date.now() / 1000) - 3600; 

      const paymasterData = concat([
        pad(numberToHex(validUntil), { size: 32 }),
        pad(numberToHex(validAfter), { size: 32 }),
      ]);

      let userOperation: UserOperation;

      if (!isDeployed) {
        const { factory, factoryData } =
          await state.smartAccount.getFactoryArgs();

        userOperation = {
          sender: state.smartAccount.address,
          nonce: BigInt(nonce),
          factory,
          factoryData,
          callData,
          callGasLimit: 200000n,
          verificationGasLimit: 20000000n,
          preVerificationGas: 20000n,
          maxFeePerGas,
          maxPriorityFeePerGas,
          paymaster,
          paymasterVerificationGasLimit: 200000n,
          paymasterPostOpGasLimit: 10000n,
          paymasterData: paymasterData,
          signature: "0x",
        } as UserOperation;
      } else {
        userOperation = {
          sender: state.smartAccount.address,
          nonce: BigInt(nonce),
          callData,
          callGasLimit: 100000n,
          verificationGasLimit: 20000000n,
          preVerificationGas: 20000n,
          maxFeePerGas,
          maxPriorityFeePerGas,
          paymaster,
          paymasterVerificationGasLimit: 200000n,
          paymasterPostOpGasLimit: 10000n,
          paymasterData: paymasterData,
          signature: "0x",
        } as UserOperation;
      }

      //wait 2 seconds before signing the transaction to prevent the webauth failing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let signature = await state.smartAccount.signUserOperation(userOperation);

      userOperation.signature = signature;

      const packedUserOp = toPackedUserOperation(userOperation);

      packedUserOp.signature = signature;
      const serializableUserOp = toSerializablePackedUserOp(packedUserOp);

      const response = await fetch(`${backendUrl}/send-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializableUserOp),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send transaction");
      }

      const { txHash } = await response.json();

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
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
      const privateKey = generatePrivateKey();
      const sessionKey = privateKeyToAccount(privateKey);

      const data = encodeFunctionData({
        abi: [CREATE_SESSION_KEY_ABI],
        functionName: "createSessionKey",
        args: [sessionKey.address],
      });

      await sendUserOperation(state.smartAccount.address, 0n, data);

      const credential = state.credential;
      if (credential) {
        const account = toWebAuthnAccount({ credential });

        const updatedSmartAccount = await toGardenSmartAccount({
          client,
          owner: account,
          sessionKey,
          address: state.smartAccount.address,
        });

        await encryptedStorage.store(`sessionKey_${state.accountAddress}`, {
          address: sessionKey.address,
          privateKey: privateKey,
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

  const deleteSessionKey = async () => {
    if (!state.smartAccount || !state.sessionKey) return;
  
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
  
    try {
      await encryptedStorage.remove(`sessionKey_${state.accountAddress}`);
  
      const account = toWebAuthnAccount({ credential: state.credential! });
      const updatedSmartAccount = await toGardenSmartAccount({
        client,
        owner: account,
        address: state.smartAccount.address,
      });
  
      setState((prev) => ({
        ...prev,
        smartAccount: updatedSmartAccount,
        sessionKey: null,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error deleting session key:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Session key deletion failed",
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

  useEffect(() => {
    const initializeFromStorage = async () => {
      const currentSession = localStorage.getItem("current_session");
      if (currentSession) {
        const { email, credential, accountAddress } =
          JSON.parse(currentSession);

        try {
          const storedSessionKey = await encryptedStorage.retrieve(
            `sessionKey_${accountAddress}`
          );

          const account = toWebAuthnAccount({ credential });

          const sessionKey = storedSessionKey
            ? privateKeyToAccount(storedSessionKey.privateKey as `0x${string}`)
            : undefined;

          const smartAccount = await toGardenSmartAccount({
            client,
            owner: account,
            sessionKey,
            address: accountAddress,
          });

          setState((prev) => ({
            ...prev,
            smartAccount,
            credential,
            accountAddress: smartAccount.address,
            sessionKey,
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error initializing wallet:", error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Wallet initialization failed",
          }));
        }
      }
    };

    initializeFromStorage();
  }, []);

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
        deleteSessionKey,
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
