# Development only: official archived upstream, pinned source; review AGPL license.
FROM golang:1.24.8-bookworm AS build
RUN go install github.com/minio/minio@7aac2a2c5b7c882e68c1ce017d8256be2feea27f
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/* && useradd -u 10001 -m minio && mkdir /data && chown minio:minio /data
COPY --from=build /go/bin/minio /usr/local/bin/minio
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
