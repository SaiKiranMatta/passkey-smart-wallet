package server

import (
	"net/http"
	"wallet-backend/config"
	"wallet-backend/db"
	services "wallet-backend/ethereum"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db      *gorm.DB
	config  *config.Config
	ethServ *services.EthereumService
}

func NewHandler(db *gorm.DB, cfg *config.Config) *Handler {
	client, err := ethclient.Dial(cfg.Chain.RPC)
	if err != nil {
		panic(err)
	}

	ethServ := services.NewEthereumService(client, cfg)

	return &Handler{
		db:      db,
		config:  cfg,
		ethServ: ethServ,
	}
}

func (h *Handler) StoreCredential(c *gin.Context) {
	var cred db.Credential
	if err := c.BindJSON(&cred); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := h.db.Create(&cred)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, cred)
}

func (h *Handler) GetCredential(c *gin.Context) {
	email := c.Param("email")
	var cred db.Credential

	result := h.db.Where("email = ?", email).First(&cred)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Credential not found"})
		return
	}

	c.JSON(http.StatusOK, cred)
}

func (h *Handler) EstimateGas(c *gin.Context) {
	var userOp db.UserOperation
	if err := c.BindJSON(&userOp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	gasEstimates, err := h.ethServ.EstimateGas(userOp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gasEstimates)
}

func (h *Handler) SendTransaction(c *gin.Context) {
	var packedUserOp db.PackedUserOp
	if err := c.BindJSON(&packedUserOp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	txHash, err := h.ethServ.SendUserOperation(packedUserOp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"txHash": txHash})
}
