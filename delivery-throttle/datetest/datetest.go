package datetest

import (
	"log"
	"strconv"
	"strings"
	"time"
)

func atoi(d string) int {
	i, err := strconv.Atoi(d)
	if err != nil {
		log.Fatal(err)
	}
	return i
}

// BeforeNow checks a mm/dd/yyyy string to determine if it is before now.
func BeforeNow(d string) bool {
	f := strings.FieldsFunc(d, func(r rune) bool { return r == '/' })
	t := time.Date(atoi(f[2]), time.Month(atoi(f[0])), atoi(f[1]), 0, 0, 0, 0, time.UTC)
	return t.Before(time.Now())
}
