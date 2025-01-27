package db

import (
	"encoding/json"

	"gorm.io/gorm"
)

type Credential struct {
	gorm.Model
	Email          string          `json:"email" gorm:"uniqueIndex"`
	CredentialRaw  json.RawMessage `json:"credential"`
	AccountAddress string          `json:"accountAddress"`
}

type UserOperation struct {
	Sender                        string `json:"sender"`
	Nonce                         string `json:"nonce"`
	InitCode                      string `json:"initCode"`
	CallData                      string `json:"callData"`
	CallGasLimit                  string `json:"callGasLimit"`
	VerificationGasLimit          string `json:"verificationGasLimit"`
	PreVerificationGas            string `json:"preVerificationGas"`
	MaxFeePerGas                  string `json:"maxFeePerGas"`
	MaxPriorityFeePerGas          string `json:"maxPriorityFeePerGas"`
	Paymaster                     string `json:"paymaster"`
	PaymasterVerificationGasLimit string `json:"paymasterVerificationGasLimit"`
	PaymasterPostOpGasLimit       string `json:"paymasterPostOpGasLimit"`
	PaymasterData                 string `json:"paymasterData"`
	Signature                     string `json:"signature"`
}
