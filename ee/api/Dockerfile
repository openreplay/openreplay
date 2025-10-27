FROM nixos/nix:latest AS builder

# Enable flakes and other experimental features
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

WORKDIR /build

# Copy shell.nix - this provides Python with lxml and other packages from Nix
COPY shell.nix .

# Build the Nix environment (downloads and installs Nix packages)
RUN nix-shell --run "python --version"

# Copy requirements for additional pip packages
COPY requirements-pip.txt .

# Install only the remaining packages via pip (those not in nixpkgs)
RUN nix-shell --run "pip install --prefix=/build/python-env -r requirements-pip.txt"

# Final stage
FROM nixos/nix:latest

# Enable flakes
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

WORKDIR /app

# Copy shell.nix first
COPY shell.nix .

# Build the Nix environment in final stage
RUN nix-shell --run "echo 'Nix environment ready with lxml and other packages'"

# Copy pip-installed packages from builder
COPY --from=builder /build/python-env /usr/local

# Copy application code
COPY . .
RUN mv env.default .env

# Create non-root user
RUN adduser -u 1001 -D openreplay || true

ARG envarg
ARG GIT_SHA
ENV SOURCE_MAP_VERSION=0.7.4 \
  APP_NAME=chalice \
  LISTEN_PORT=8000 \
  PRIVATE_ENDPOINTS=false \
  ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=$GIT_SHA

USER 1001

ENTRYPOINT ["nix-shell", "--run"]
CMD ["./entrypoint.sh"]
