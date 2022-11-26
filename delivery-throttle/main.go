package main

import (
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"

	log "github.com/sirupsen/logrus"
)

func heartbeat(c config.Config, quit chan bool) {
	nextRun := time.Now().Add(c.SleepDuration())
	for {
		select {
		case <-quit:
			return
		default:
			log.Printf("next run in approximately: %s", time.Until(nextRun))
			time.Sleep(c.HeartbeatDuration())
		}
	}
}

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
		quit := make(chan bool)
		go heartbeat(cfg, quit)
		time.Sleep(cfg.SleepDuration())
		quit <- true
	}

	log.Printf("shutting down")
}
