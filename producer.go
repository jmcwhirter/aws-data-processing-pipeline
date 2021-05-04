package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/kinesis"
)

const (
)

type event struct {
	Timestamp  string
	EventType  string
	AccountUid string
	Name       string
	PageResponse   int
}

func main() {
	partition := flag.String("partition", "partition", "Partition Key")
	stream := flag.String("stream", "reporting_stream", "Stream Name")

	flag.Parse()

	sess := session.Must(
		session.NewSessionWithOptions(
			session.Options{
				SharedConfigState: session.SharedConfigEnable,
			},
		),
	)

	simulateEvent(kinesis.New(sess), partition, stream)
}

func simulateEvent(client *kinesis.Kinesis, partition, stream *string) {
	rand.Seed(time.Now().UnixNano())

	eventTypes := make([]string, 0)
	eventTypes = append(eventTypes,
		"DELETED",
		"CREATED",
		"UPDATED",
		"")
	names := make([]string, 0)
	names = append(names,
		"Fatemeh",
		"Noel",
		"Andre",
		"Justin",
		"Andrei",
		"Radu",
		"")
	accounts := make([]string, 0)
	accounts = append(accounts,
		"1111",
		"2222")

	ticker := time.NewTicker(time.Second/10)

	for range ticker.C {
		status, _ := json.Marshal(
			&event{
				Timestamp:  randate().Format("2006-01-02 15:04:05.000"),
				EventType:  eventTypes[rand.Intn(len(eventTypes))],
				AccountUid: accounts[rand.Intn(len(accounts))],
				Name:       names[rand.Intn(len(names))],
				PageResponse:   rand.Intn(1000),
			},
		)
		putRecordInput := &kinesis.PutRecordInput{
			Data:         append([]byte(status), "\n"...),
			PartitionKey: partition,
			StreamName:   stream,
		}

		if _, err := client.PutRecord(putRecordInput); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		fmt.Print(".")
	}
}

func randate() time.Time {
    min := time.Date(2018, 1, 0, 0, 0, 0, 0, time.UTC).Unix()
    max := time.Date(2020, 1, 0, 0, 0, 0, 0, time.UTC).Unix()
    delta := max - min

    sec := rand.Int63n(delta) + min
    return time.Unix(sec, 0)
}
