package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloud.google.com/go/storage"
	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"
	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/datetest"
	log "github.com/sirupsen/logrus"
	"google.golang.org/api/option"
)

func storeOrders(cfg config.Config, orders Orders) string {
	futureOrders := Orders{}
	for _, order := range orders.Collection {
		for _, note := range order.NoteAttributes {
			if note.Name == "delivery-date" || note.Name == "pickup-date" {
				if !datetest.BeforeNow(note.Value) {
					futureOrders.Collection = append(futureOrders.Collection, order)
				}
			}
		}
	}

	od, err := json.Marshal(futureOrders)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	client, err := storage.NewClient(ctx, option.WithCredentialsJSON([]byte(cfg.GCPKeyJSON)))
	if err != nil {
		log.Fatal(err)
	}
	bh := client.Bucket("rutherford-prime-meats-07070")
	oh := bh.Object("orders/order-data.js")
	w := oh.NewWriter(ctx)

	w.Write([]byte("window._ORDER_DATA="))
	w.Write(od)

	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		log.Fatal(err)
	}
	completeTime := time.Now().In(loc).Format("Mon, 2 Jan 2006 15:04 MST")
	date := fmt.Sprintf(";\nwindow._GEN_DATE='%s';\n", completeTime)
	w.Write([]byte(date))
	if err := w.Close(); err != nil {
		log.Fatal(err)
	}

	oh.Update(ctx, storage.ObjectAttrsToUpdate{CacheControl: "no-cache, max-age:0"})
	oh.ACL().Set(ctx, storage.AllUsers, storage.RoleReader)

	return completeTime
}
