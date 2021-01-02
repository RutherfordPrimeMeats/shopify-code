package main

import (
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"

	log "github.com/sirupsen/logrus"
)

func heartbeat(c config.Config, s string, quit chan bool) {
	for {
		select {
		case <-quit:
			return
		default:
			time.Sleep(c.HeartbeatDuration())
			log.Printf("last complete: %s", s)
		}
	}
}

func main() {
	cfg := config.FromEnv()

	exitTime := cfg.ExitTime()

	log.SetFormatter(&log.TextFormatter{ForceColors: true})

	for time.Now().Before(exitTime) {
		orders := getOrdersFromURL(cfg, cfg.BaseURL+"/orders.json?status=any&limit=250")
		disableDates(cfg, datesToDisable(orders))
		t := storeOrders(cfg, orders)
		log.Printf("complete: %s", t)
		quit := make(chan bool)
		go heartbeat(cfg, t, quit)
		time.Sleep(cfg.SleepDuration())
		quit <- true
	}

	log.Printf("shutting down")
}
