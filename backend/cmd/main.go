package main

import (
	"log"
	"wallet-backend/config"
	"wallet-backend/db"
	"wallet-backend/server"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Initialize database
	database, err := db.Initialize(cfg.Database)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize server
	server := server.NewServer(database, cfg)
	server.Start()
}
