package main

import (
	"net/http"
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"
	
	log "github.com/sirupsen/logrus"
)

func pingHealthChecks() {
	var client = &http.Client{
		Timeout: 10 * time.Second,
	}

	_, err := client.Head(config.FromEnv().HealthcheckURL)
	if err != nil {
		log.Printf("%s", err)
	}
	log.Printf("Healthchecks.io pinged")
}
