package config

import (
	"github.com/kelseyhightower/envconfig"
	log "github.com/sirupsen/logrus"
)

// Config is the main binary configuration.
type Config struct {
	APISecret   string // https://key:password@
	BaseURL     string
	BlockedDays []string
	GCPKeyJSON  string
	LogPath     string
	MaxOrders   int
	WarnOrders  int
}

// FromEnv returns a Config from the environment variables.
func FromEnv() Config {
	var c Config
	err := envconfig.Process("rpm_dt", &c)
	if err != nil {
		log.Fatal(err)
	}
	return c
}
