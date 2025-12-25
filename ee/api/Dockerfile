FROM nixos/nix:latest AS builder

# Enable flakes and other experimental features
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

WORKDIR /build

# Copy shell.nix - this provides Python with system libraries (lxml, xmlsec)
COPY shell.nix .

# Build the Nix environment - this provides lxml and xmlsec with C library compatibility
RUN nix-shell --run "python --version"

# Copy requirements file
COPY requirements.txt .

# Install packages from requirements.txt (lxml/xmlsec already provided by Nix)
RUN nix-shell --run "pip install --prefix=/build/python-env -r requirements.txt"

# Create a script that captures the environment
RUN nix-shell --run 'env' | grep -E "^(PATH|PYTHONPATH|LD_LIBRARY_PATH|NIX_)" > /build/nix-env.sh

# Create a minimal Nix store with only runtime dependencies
RUN mkdir -p /build/nix-minimal/store && \
  nix-shell --run 'nix-store --query --requisites $(which python) $(nix-build --no-out-link shell.nix)' | \
  grep -v '\-source$' | \
  while IFS= read -r storepath; do \
  if [ -e "$storepath" ]; then \
  cp -a "$storepath" /build/nix-minimal/store/ 2>/dev/null || true; \
  fi; \
  done

# Final stage - use Alpine for smaller base
FROM alpine:3.23

WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache tini bash

# Copy only the minimal Nix store (runtime dependencies, no source code)
COPY --from=builder /build/nix-minimal/store /nix/store

# Copy pip-installed packages from builder
COPY --from=builder /build/python-env /usr/local

# Copy the environment setup
COPY --from=builder /build/nix-env.sh /etc/profile.d/nix-env.sh

# Find and symlink Python from Nix store
RUN PYTHON_BIN=$(find /nix/store -path "*/bin/python3.13" -type f 2>/dev/null | grep python3-3.13 | head -1) && \
  if [ -n "$PYTHON_BIN" ]; then \
  ln -sf $PYTHON_BIN /usr/local/bin/python && \
  ln -sf $PYTHON_BIN /usr/local/bin/python3 && \
  echo "Python linked: $PYTHON_BIN"; \
  else \
  echo "ERROR: Python not found in /nix/store"; exit 1; \
  fi

# Copy application code
COPY . .
RUN mv env.default .env

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Create non-root user with home directory
RUN adduser -u 1001 -D -h /home/openreplay openreplay && \
  chown -R openreplay:openreplay /app

ARG envarg
ARG GIT_SHA
ENV SOURCE_MAP_VERSION=0.7.4 \
  APP_NAME=chalice \
  LISTEN_PORT=8000 \
  PRIVATE_ENDPOINTS=false \
  ENTERPRISE_BUILD=${envarg} \
  GIT_SHA=$GIT_SHA \
  PYTHONPATH=/usr/local/lib/python3.13/site-packages \
  LD_LIBRARY_PATH=/nix/store \
  PATH=/usr/local/bin:$PATH

USER 1001

ENTRYPOINT ["/sbin/tini", "-s", "--"]
CMD ["/bin/bash", "-c", "source /etc/profile.d/nix-env.sh 2>/dev/null || true; exec ./entrypoint.sh"]
