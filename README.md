# Project Setup Guide

## Prerequisites

Ensure you have the following installed on your system before proceeding:

- Node.js (v16 or later)
- npm
- Go (v1.19 or later)
- Foundry (for smart contract development)
- Anvil (local Ethereum node)

## Environment Variables

### Backend (.env)
```env
# Database Configuration
DB_URL="<your-database-connection-string>"
# Server Configuration
SERVER_PORT=<port-number>
# Chain Configuration
CHAIN_RPC="<your-rpc-url>"
ENTRYPOINT_ADDRESS="<your-entrypoint-contract-address>"
BUNDLER_PRIVATE_KEY="<your-bundler-private-key>"
PAYMASTER_ADDRESS="<your-paymaster-contract-address>"
CHAIN_ID=<your-chain-id>
```

### Frontend (.env)
```env
NEXT_PUBLIC_BACKEND_URL="<your-backend-url>"
NEXT_PUBLIC_ENTRYPOINT_ADDRESS="<your-entrypoint-contract-address>"
NEXT_PUBLIC_CHAIN_ID=<your-chain-id>
NEXT_PUBLIC_FACTORY_ADDRESS="<your-factory-contract-address>"
NEXT_PUBLIC_PAYMASTER_ADDRESS="<your-paymaster-contract-address>"
```

### Smart Contracts (.env)
```env
PRIVATE_KEY="<your-private-key>"
```

## Installation and Setup

### Frontend

The frontend is written in Next.js. To set it up:

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory and add the environment variables listed above.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

### Smart Contracts

To deploy and interact with the smart contracts:

1. Create a `.env` file in the root directory and add the environment variables listed above.

2. Start a local Anvil instance:
   ```bash
   anvil
   ```

3. Deploy the contracts using the provided script:
   ```bash
   ./deploy.sh
   ```

Alternatively, you can deploy manually using the following commands:
```bash
source .env
forge script script/SmartAccountFactory.s.sol:DeploySmartAccount --rpc-url http://localhost:8545 --broadcast
```

### Backend

The backend is written in Go. Follow these steps to set it up:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Create a `.env` file in the backend directory and add the environment variables listed above.

4. Run the backend server:
   ```bash
   go run cmd/main.go
   ```
