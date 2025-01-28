package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	Chain    ChainConfig
}

type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	DBName   string
	Port     string
}

type ServerConfig struct {
	Port         string
	AllowOrigins []string
}

type ChainConfig struct {
	RPC            string
	EntryPointAddr string
	BundlerPrivKey string
	PaymasterAddr  string
	ChainId        string
}

func Load() (*Config, error) {
	err := godotenv.Load()
	if err != nil {
		return nil, err
	}

	return &Config{
		Database: DatabaseConfig{
			Host:     getEnvOrDefault("DB_HOST", "localhost"),
			User:     getEnvOrDefault("DB_USER", "postgres"),
			Password: getEnvOrDefault("DB_PASSWORD", "postgres"),
			DBName:   getEnvOrDefault("DB_NAME", "wallet_db"),
			Port:     getEnvOrDefault("DB_PORT", "5432"),
		},
		Server: ServerConfig{
			Port:         getEnvOrDefault("SERVER_PORT", "7930"),
			AllowOrigins: []string{getEnvOrDefault("ALLOWED_ORIGIN", "http://localhost:3000")},
		},
		Chain: ChainConfig{
			RPC:            getEnvOrDefault("CHAIN_RPC", "http://localhost:8545"),
			EntryPointAddr: getEnvOrDefault("ENTRYPOINT_ADDRESS", "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"),
			BundlerPrivKey: os.Getenv("BUNDLER_PRIVATE_KEY"),
			PaymasterAddr:  getEnvOrDefault("PAYMASTER_ADDRESS", "0x0000000000000000000000000000000000000000"),
			ChainId:        getEnvOrDefault("CHAIN_ID", "31337"),
		},
	}, nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
