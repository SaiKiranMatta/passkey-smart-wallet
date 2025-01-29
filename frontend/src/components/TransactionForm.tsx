"use client";

import React, { useState } from 'react';
import { useWallet } from "@/context/WalletContext";
import { isAddress } from 'viem';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TransactionForm = () => {
  const { sendUserOperation, isLoading, sessionKey } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAddress(recipientAddress)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (sessionKey) {
        toast.info("Signing transaction with session key...");
      }

      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const valueInWei = BigInt(parseFloat(amount) * 1e18);
      
      const receipt = await sendUserOperation(recipientAddress as `0x${string}`, valueInWei);
      
      toast.success("Transaction sent successfully!", {
        description: "Your transfer has been confirmed"
      });
      
      setRecipientAddress('');
      setAmount('');
    } catch (err) {
      toast.error("Transaction failed", {
        description: "Please try again later"
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className=" w-[32rem] mx-auto">
      <CardHeader>
        <CardTitle>Send Transaction</CardTitle>
        <CardDescription>
          Send ETH to any Ethereum address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Recipient Address</Label>
            <Input
              id="address"
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.000000000000000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
};

export default TransactionForm;