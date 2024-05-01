package main

import (
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"

	log "github.com/sirupsen/logrus"
)

func main() {
	cfg := config.FromEnv()

	exitTime := cfg.ExitTime()

	log.SetFormatter(&log.TextFormatter{ForceColors: true})

	for time.Now().Before(exitTime) {
		pingHealthChecks()
		orders := getOrdersFromURL(cfg, cfg.BaseURL+"/orders.json?status=any&limit=250")
		disableDates(cfg, datesToDisable(orders))
		t := storeOrders(cfg, orders)
		log.Printf("complete: %s", t)
		time.Sleep(cfg.SleepDuration())
	}

	log.Printf("shutting down")
}
