FROM nixos/nix:latest AS builder

# Enable flakes and other experimental features
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

WORKDIR /build

# Copy shell.nix and requirements
COPY shell.nix .
COPY requirements.txt .

# Install dependencies using Nix
RUN nix-shell --run "pip install --prefix=/build/python-env -r requirements.txt"

# Final stage
FROM nixos/nix:latest

# Enable flakes
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

WORKDIR /app

# Copy Nix environment
COPY shell.nix .
COPY --from=builder /build/python-env /usr/local

# Install runtime dependencies
RUN nix-shell --run "echo 'Nix environment ready'"

# Copy application code
COPY . .
RUN mv env.default .env

# Create non-root user
RUN adduser -u 1001 openreplay -D

ARG envarg
ARG GIT_SHA
ENV SOURCE_MAP_VERSION=0.7.4 \
  APP_NAME=chalice \
  LISTEN_PORT=8000 \
  PRIVATE_ENDPOINTS=false \
  ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=$GIT_SHA \
  PYTHONPATH=/usr/local/lib/python3.13/site-packages

USER 1001

ENTRYPOINT ["nix-shell", "--run"]
CMD ["./entrypoint.sh"]
