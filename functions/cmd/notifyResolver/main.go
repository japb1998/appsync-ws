package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
)

type Event struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Message string `json:"message"`
}

func (e Event) String() string {
	return fmt.Sprintf("From: %s, To: %s, Message: %s", e.From, e.To, e.Message)
}

// note: using the default vtl template the even is passed as map[string]interface{} although can be transformed to a struct
func handler(ctx context.Context, event Event) (*Event, error) {
	fmt.Println(event)
	return &event, nil
}

func main() {
	lambda.Start(handler)
}
