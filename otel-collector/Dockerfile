# Build context: otel-collector
#   docker build -t otel-collector otel-collector
ARG OTEL_BUILDER_VERSION=0.163.0

FROM golang:1.26-alpine AS build
ARG OTEL_BUILDER_VERSION
RUN go install go.opentelemetry.io/collector/cmd/builder@v${OTEL_BUILDER_VERSION}
WORKDIR /build
COPY builder-config.yaml .
RUN CGO_ENABLED=0 builder --config=builder-config.yaml

FROM alpine:3.23
RUN apk add --no-cache ca-certificates && \
    addgroup -S -g 10001 otel && \
    adduser -S -u 10001 -G otel otel
COPY --from=build /build/_build/otelcol-openreplay /otelcol-openreplay
COPY config.yaml /etc/otelcol/config.yaml
USER 10001:10001
WORKDIR /tmp
EXPOSE 4318 8888 13133
ENTRYPOINT ["/otelcol-openreplay"]
CMD ["--config", "/etc/otelcol/config.yaml"]
