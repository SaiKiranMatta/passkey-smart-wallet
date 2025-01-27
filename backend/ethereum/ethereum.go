package services

import (
	"crypto/ecdsa"
	"wallet-backend/config"
	"wallet-backend/db"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type EthereumService struct {
	client     *ethclient.Client
	config     *config.Config
	bundlerKey *ecdsa.PrivateKey
	entryPoint common.Address
	paymaster  common.Address
}

func NewEthereumService(client *ethclient.Client, cfg *config.Config) *EthereumService {
	privateKey, err := crypto.HexToECDSA(cfg.Chain.BundlerPrivKey)
	if err != nil {
		panic(err)
	}

	return &EthereumService{
		client:     client,
		config:     cfg,
		bundlerKey: privateKey,
		entryPoint: common.HexToAddress(cfg.Chain.EntryPointAddr),
		paymaster:  common.HexToAddress(cfg.Chain.PaymasterAddr),
	}
}

func (s *EthereumService) EstimateGas(userOp db.UserOperation) (map[string]string, error) {
	// TODO: Implement actual gas estimation logic using EntryPoint contract
	// This would involve calling the appropriate estimation methods on the EntryPoint contract

	// For now, returning dummy values
	return map[string]string{
		"callGasLimit":         "100000",
		"verificationGasLimit": "200000",
		"preVerificationGas":   "21000",
	}, nil
}

func (s *EthereumService) SendUserOperation(userOp db.UserOperation) (string, error) {
	// TODO: Implement actual transaction sending logic
	// This would involve:
	// 1. Converting the UserOperation to the appropriate format
	// 2. Calling handleOps on the EntryPoint contract
	// 3. Returning the transaction hash

	return "0x...", nil
}
