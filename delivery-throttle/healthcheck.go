package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"
)

func pingHealthChecks() {
	var client = &http.Client{
		Timeout: 10 * time.Second,
	}

	_, err := client.Head(config.FromEnv().HealthcheckURL)
	if err != nil {
		fmt.Printf("%s", err)
	}
	fmt.Printf("Healthchecks.io pinged")
}
