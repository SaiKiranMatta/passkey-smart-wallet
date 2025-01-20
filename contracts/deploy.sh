#!/bin/bash
source .env
forge script script/SmartAccountFactory.s.sol:DeploySmartAccount --rpc-url http://localhost:8545 --broadcast