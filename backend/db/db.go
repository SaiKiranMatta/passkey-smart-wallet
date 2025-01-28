package db

import (
	"wallet-backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Initialize(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.URL

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto-migrate schemas
	// err = db.AutoMigrate(&Credential{})
	// if err != nil {
	// 	return nil, err
	// }

	return db, nil
}
