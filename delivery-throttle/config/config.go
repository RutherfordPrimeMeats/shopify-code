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
	Heartbeat string
}

func duration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		log.Fatal(err)
	}
	return d
}

func (c *Config) HeartbeatDuration() time.Duration {
	return duration(c.Heartbeat)
}

func (c *Config) SleepDuration() time.Duration {
	return duration(c.SleepTime)
}

func (c *Config) ExitTime() time.Time {
	return time.Now().Add(duration(c.ExitAfter))
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
