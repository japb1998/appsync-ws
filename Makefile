.Phony: build-resolver deploy
build-resolver:
	@echo "Removing old resolvers"
	rm -rf ./bin/functions
	@echo "Building resolvers"
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o ./bin/functions/sendEventResolver/bootstrap ./functions/cmd/notifyResolver
	tsc -p js_resolvers/

deploy:
	npx aws-cdk deploy --profile personal