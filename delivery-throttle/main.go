package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/config"
	"github.com/RutherfordPrimeMeats/shopify-code/delivery-throttle/datetest"
)

// NoteAttribute is a k/v pair on an order.
type NoteAttribute struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Order represents a single order.
type Order struct {
	ID             int             `json:"id"`
	CreatedAt      string          `json:"created_at"`
	NoteAttributes []NoteAttribute `json:"note_attributes"`
}

// Orders are all orders returned from the API.
type Orders struct {
	Collection []Order `json:"orders"`
}

func main() {
	cfg := config.New("config.json")

	f := logFile()
	mw := io.MultiWriter(os.Stdout, f)
	log.SetOutput(mw)
	defer f.Close()

	orders := getOrdersFromURL(cfg, cfg.BaseURL+"/orders.json?status=any&limit=250")
	disableDates(cfg, datesToDisable(orders))
}

func logFile() *os.File {
	date := strings.Fields(time.Now().String())[0]
	os.Mkdir("logs", 0755)
	os.Mkdir(fmt.Sprintf("logs/%s", date), 0755)
	logPath := fmt.Sprintf("logs/%s/%d.log", date, time.Now().Unix())
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

	url := cfg.BaseURL + "/themes/155701522/assets.json"
	url = strings.Replace(url, "https://", cfg.APISecret, 1)

	log.Printf("Putting: %s\n", payload)

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
