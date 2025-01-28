package ethereum

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strconv"
	"wallet-backend/config"
	"wallet-backend/db"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

func BytesToBytes32(b []byte) [32]byte {
	var result [32]byte
	copy(result[:], b)
	return result
}

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

func (s *EthereumService) SendUserOperation(userOp db.PackedUserOp) (string, error) {
	chainID, err := strconv.ParseInt(s.config.Chain.ChainId, 10, 64)
	if err != nil {
		return "", fmt.Errorf("failed to parse chain ID: %w", err)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.bundlerKey, big.NewInt(chainID))
	if err != nil {
		return "", fmt.Errorf("failed to create auth: %w", err)
	}

	// Create EntryPoint contract instance
	entryPoint, err := NewEntrypoint(s.entryPoint, s.client)
	if err != nil {
		return "", fmt.Errorf("failed to create entryPoint instance: %w", err)
	}

	contractUserOp := PackedUserOperation{
		Sender:             common.HexToAddress(userOp.Sender),
		Nonce:              new(big.Int).SetBytes(common.FromHex(userOp.Nonce)),
		InitCode:           common.FromHex(userOp.InitCode),
		CallData:           common.FromHex(userOp.CallData),
		AccountGasLimits:   BytesToBytes32(common.FromHex(userOp.AccountGasLimits)),
		GasFees:            BytesToBytes32(common.FromHex(userOp.GasFees)),
		PreVerificationGas: new(big.Int).SetBytes(common.FromHex(userOp.PreVerificationGas)),
		PaymasterAndData:   common.FromHex(userOp.PaymasterAndData),
		Signature:          common.FromHex(userOp.Signature),
	}

	// Get bundler address from private key
	bundlerAddress := crypto.PubkeyToAddress(s.bundlerKey.PublicKey)

	// Send the transaction
	tx, err := entryPoint.HandleOps(
		auth,
		[]PackedUserOperation{contractUserOp},
		bundlerAddress,
	)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	return tx.Hash().Hex(), nil
}
