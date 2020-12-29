package config

import (
	"encoding/json"
	"io/ioutil"
	"os"

	log "github.com/sirupsen/logrus"
)

// Config is the main binary configuration.
type Config struct {
	APISecret   string // https://key:password@
	BaseURL     string
	BlockedDays []string
	GCPKeyFile  string
	LogPath     string
	MaxOrders   int
	WarnOrders  int
}

// New returns a Config from a json file at the provided path.
func New(path string) Config {
	f, err := os.Open(path)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	bytes, err := ioutil.ReadAll(f)
	if err != nil {
		log.Fatal(err)
	}

	var cfg Config
	err = json.Unmarshal(bytes, &cfg)
	if err != nil {
		log.Fatal(err)
	}
	return cfg
}
