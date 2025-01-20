import {  createTestClient, http } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction'
import { foundry } from 'viem/chains';

const client = createTestClient({
    chain: foundry,
    mode: 'anvil',
    transport: http(), 
  })


export const bundlerClient = createBundlerClient({
  client,
  transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL),
});

