package config

import (
	"time"

	"github.com/kelseyhightower/envconfig"
	log "github.com/sirupsen/logrus"
)

// Config is the main binary configuration.
type Config struct {
	APISecret   string // https://key:password@
	BaseURL     string
	BlockedDays []string
	GCPKeyJSON  string

	MaxOrders  int
	WarnOrders int

	SleepTime string
	ExitAfter string
}

func (c *Config) SleepDuration() time.Duration {
	d, err := time.ParseDuration(c.SleepTime)
	if err != nil {
		log.Fatal(err)
	}
	return d
}

func (c *Config) ExitTime() time.Time {
	d, err := time.ParseDuration(c.ExitAfter)
	if err != nil {
		log.Fatal(err)
	}
	return time.Now().Add(d)
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
