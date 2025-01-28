import React, { useState } from 'react';
import { useWallet } from "@/context/WalletContext";
import { isAddress } from 'viem';

const TransactionForm = () => {
  const { sendUserOperation, isLoading, error } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txError, setTxError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');

    // Validate address
    if (!isAddress(recipientAddress)) {
      setTxError('Invalid Ethereum address');
      return;
    }

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setTxError('Invalid amount');
      return;
    }

    try {
      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const valueInWei = BigInt(parseFloat(amount) * 1e18);
      
      await sendUserOperation(recipientAddress as `0x${string}`, valueInWei);
      
      // Clear form on success
      setRecipientAddress('');
      setAmount('');
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto ">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            id="address"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-xl py-2 pl-3 text-sm pr-10 border focus:outline-none focus:ring-2 focus:ring-[#D7E96D]"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (ETH)
          </label>
          <input
            id="amount"
            type="number"
            step="0.000000000000000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full rounded-xl py-2 pl-3 text-sm pr-10 border focus:outline-none focus:ring-2 focus:ring-[#D7E96D]"
          />
        </div>

        {(txError || error) && (
          <div className="text-red-500 text-sm">
            {txError || error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 disabled:bg-blue-300"
          >
          {isLoading ? "Sending..." : "Send Transaction"}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;