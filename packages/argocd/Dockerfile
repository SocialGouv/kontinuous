FROM argoproj/argocd:v2.6.3

# Switch to root for the ability to perform install
USER root

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    curl \
    ca-certificates \
    wget \
    git \
  && rm -rf /var/lib/apt/lists/*

# renovate: datasource=node depName=node versioning=node
ARG NODE_VERSION=18

ENV NODE_VERSION=$NODE_VERSION
RUN wget -qO- https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install nodejs \
  && npm install -g yarn \
  && rm -rf /var/lib/apt/lists/*
  
RUN mkdir -p /workspace
RUN chown 1001:1001 /workspace
RUN git config --global --add safe.directory /workspace


COPY --from=ghcr.io/socialgouv/kontinuous:v1.147.25 /usr/local/bin /usr/local/bin/
COPY --from=ghcr.io/socialgouv/kontinuous:v1.147.25 --chown=999:999 /opt/kontinuous /opt/kontinuous/

# Switch back to non-root user
USER 999