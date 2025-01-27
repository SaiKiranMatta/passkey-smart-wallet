package db

import (
	"fmt"
	"wallet-backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Initialize(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.Host, cfg.User, cfg.Password, cfg.DBName, cfg.Port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto-migrate schemas
	err = db.AutoMigrate(&Credential{})
	if err != nil {
		return nil, err
	}

	return db, nil
}
