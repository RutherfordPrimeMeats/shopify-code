FROM golang:1.15.0-buster AS builder

WORKDIR /go/src
RUN git clone https://github.com/RutherfordPrimeMeats/shopify-code.git
WORKDIR /go/src/shopify-code/delivery-throttle
RUN export GIT_COMMIT=$(git rev-list -1 HEAD) && \
  CGO_ENABLED=0 GOOS=linux go build -ldflags "-X main.gitCommit=$GIT_COMMIT" -a -installsuffix cgo .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /go/src/shopify-code/delivery-throttle/delivery-throttle .
ENTRYPOINT ["./delivery-throttle"]
