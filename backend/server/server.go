package server

import (
	"wallet-backend/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Server struct {
	router  *gin.Engine
	handler *Handler
	config  *config.Config
}

func NewServer(db *gorm.DB, cfg *config.Config) *Server {
	router := gin.Default()
	handler := NewHandler(db, cfg)

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"*"}
	corsConfig.AllowCredentials = true
	corsConfig.AddAllowHeaders("Content-Type")
	router.Use(cors.New(corsConfig))

	// Routes
	router.POST("/credentials", handler.StoreCredential)
	router.GET("/credentials/:email", handler.GetCredential)
	router.POST("/estimate-gas", handler.EstimateGas)
	router.POST("/send-transaction", handler.SendTransaction)

	return &Server{
		router:  router,
		handler: handler,
		config:  cfg,
	}
}

func (s *Server) Start() error {
	return s.router.Run(":" + s.config.Server.Port)
}
