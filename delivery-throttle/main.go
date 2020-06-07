package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"
	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/datetest"
	"google.golang.org/api/option"
)

var gitCommit string

// NoteAttribute is a k/v pair on an order.
type NoteAttribute struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Properties is k/v of a line item.
type Properties struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// LineItem is the products in the order.
type LineItem struct {
	Title      string       `json:"title"`
	Quantity   int          `json:"quantity"`
	Properties []Properties `json:"properties"`
}

// Customer is the person who created the order.
type Customer struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// Order represents a single order.
type Order struct {
	ID                int             `json:"id"`
	Name              string          `json:"name"`
	Note              string          `json:"note"`
	CreatedAt         string          `json:"created_at"`
	LineItems         []LineItem      `json:"line_items"`
	NoteAttributes    []NoteAttribute `json:"note_attributes"`
	Customer          Customer        `json:"customer"`
	TotalPrice        string          `json:"total_price"`
	FulfillmentStatus string          `json:"fulfillment_status"`
}

// Orders are all orders returned from the API.
type Orders struct {
	Collection []Order `json:"orders"`
}

func main() {
	configPath := flag.String("config_path", "", "path to the config file")
	flag.Parse()
	cfg := config.New(*configPath)

	f := logFile(cfg)
	mw := io.MultiWriter(os.Stdout, f)
	log.SetOutput(mw)
	defer f.Close()

	log.Printf("git commit: %s", gitCommit)

	orders := getOrdersFromURL(cfg, cfg.BaseURL+"/orders.json?status=any&limit=250")
	disableDates(cfg, datesToDisable(orders))
	storeOrders(cfg, orders)

	log.Printf("complete: %s", time.Now().Unix())
}

func logFile(cfg config.Config) *os.File {
	date := strings.Fields(time.Now().String())[0]
	os.Mkdir(cfg.LogPath, 0755)
	os.Mkdir(fmt.Sprintf("%s/%s", cfg.LogPath, date), 0755)
	logPath := fmt.Sprintf("%s/%s/%d.log", cfg.LogPath, date, time.Now().Unix())
	f, err := os.OpenFile(logPath, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		log.Fatal(err)
	}
	return f
}

func datesToDisable(orders Orders) map[string]int {
	dates := map[string]int{}
	for _, order := range orders.Collection {
		for _, note := range order.NoteAttributes {
			if note.Name == "delivery-date" || note.Name == "pickup-date" {
				dates[note.Value]++
			}
		}
	}
	return dates
}

func storeOrders(cfg config.Config, orders Orders) {
	od, err := json.Marshal(orders)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(cfg.GCPKeyFile))
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
	date := fmt.Sprintf(
		";\nwindow._GEN_DATE='%s';\n",
		time.Now().In(loc).Format("Mon, 2 Jan 2006 15:04:05 MST"))
	w.Write([]byte(date))
	if err := w.Close(); err != nil {
		log.Fatal(err)
	}

	oh.Update(ctx, storage.ObjectAttrsToUpdate{CacheControl: "no-cache, max-age:0"})
	oh.ACL().Set(ctx, storage.AllUsers, storage.RoleReader)
}

func disableDates(cfg config.Config, dates map[string]int) {
	assetTmpl := `{"asset": {"key": "assets/sold-out.js", "value": "%s"}}`

	asset := "window.SOLD_OUT_DATES=["
	sod := []string{}
	for _, date := range cfg.BlockedDays {
		sod = append(sod, "'"+date+"'")
	}
	for date, count := range dates {
		if datetest.BeforeNow(date) {
			continue
		}
		switch {
		case count >= cfg.MaxOrders:
			log.Printf("date %s has %d orders, disabling\n", date, count)
			f := strings.FieldsFunc(date, func(r rune) bool { return r == '/' })
			d := f[2] + "-" + strings.TrimPrefix(f[0], "0") + "-" + strings.TrimPrefix(f[1], "0")
			d = "'" + d + "'"
			sod = append(sod, d)
		case count >= cfg.WarnOrders:
			log.Printf("date %s has %d orders, close to selling out\n", date, count)
		default:
			log.Printf("date %s has %d orders\n", date, count)
		}
	}
	asset += strings.Join(sod, ", ")
	asset += "];"

	payload := fmt.Sprintf(assetTmpl, asset)
	log.Printf("Putting: %s\n", payload)
	putAsset(cfg, payload)
}

func putAsset(cfg config.Config, payload string) {
	url := cfg.BaseURL + "/themes/155701522/assets.json"
	url = strings.Replace(url, "https://", cfg.APISecret, 1)

	c := http.DefaultClient
	req, err := http.NewRequest(http.MethodPut, url, strings.NewReader(payload))
	req.Header.Add("Content-Type", "application/json")
	if err != nil {
		log.Fatal(err)
	}

	_, err = c.Do(req)
	if err != nil {
		log.Fatal(err)
	}
}

func nextURL(res *http.Response) string {
	for _, link := range res.Header["Link"] {
		for _, l := range strings.Split(link, ", ") {
			f := strings.Fields(l)
			if f[1] == `rel="next"` {
				return strings.TrimSuffix(strings.TrimPrefix(f[0], "<"), ">;")
			}
		}
	}
	return ""
}

func getOrdersFromURL(cfg config.Config, url string) Orders {
	url = strings.Replace(url, "https://", cfg.APISecret, 1)

	c := http.DefaultClient
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Fatal(err)
	}
	res, err := c.Do(req)
	if err != nil {
		log.Fatal(err)
	}

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Fatal(err)
	}

	var orders Orders
	json.Unmarshal(body, &orders)
	nu := nextURL(res)
	if nu != "" {
		nu += "&limit=250"
		oo := getOrdersFromURL(cfg, nu)
		orders.Collection = append(orders.Collection, oo.Collection...)
	}
	return orders
}
