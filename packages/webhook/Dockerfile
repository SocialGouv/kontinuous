ARG NODE_ENV=production
# renovate: datasource=docker depName=ubuntu versioning=ubuntu
ARG UBUNTU_VERSION=22.04
FROM ubuntu:$UBUNTU_VERSION as base

RUN apt-get update && \
  apt-get install -y \
    curl \
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

# renovate: datasource=github-tags depName=kubernetes/kubectl extractVersion=^kubernetes-(?<version>.+)$
ARG KUBECTL_VERSION=1.27.1
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl --fail -sL https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

# renovate: datasource=github-releases depName=socialgouv/rollout-status
ARG ROLLOUT_STATUS_VERSION=1.13.4
ENV ROLLOUT_STATUS_VERSION=$ROLLOUT_STATUS_VERSION
RUN curl --fail -sL https://github.com/socialgouv/rollout-status/releases/download/v${ROLLOUT_STATUS_VERSION}/rollout-status-v${ROLLOUT_STATUS_VERSION}-linux-amd64 > /tmp/rollout-status \
  && mv /tmp/rollout-status /usr/local/bin/rollout-status \
  && chmod +x /usr/local/bin/rollout-status

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1000 ubuntu

WORKDIR /app

## BUILD ENVIRONMENTS
FROM base as builder
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

### INSTALL (node modules)
COPY yarn.lock .yarnrc.yml /app/
COPY .yarn .yarn

#### YARN INSTALL
RUN mkdir -p packages/webhook/src
RUN yarn fetch workspaces focus ~webhook --production \
  && yarn cache clean

### COPY (package sources)
COPY packages/webhook /app/packages/webhook/

### CUSTOMS COPY (before build)
COPY packages/common /app/packages/common/
COPY packages/helm-tree /app/packages/helm-tree/

# RUN postinstall scripts
RUN yarn workspaces foreach -t run postinstall

#### CUSTOMS RUN
RUN mkdir -p /app/packages/webhook/build

### RUN PREBUILD

### CUSTOM RUN PREBUILD

### RUN BUILD
RUN yarn workspace ~webhook build

# NODE PROJECT RUNNER
## SERVER
FROM base as server
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

# ENV GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"

RUN mkdir /secrets
RUN mkdir /artifacts && chown 1000:1000 /artifacts
WORKDIR /app

## USER AND PERMS
RUN chown -R 1000:1000 /app
USER 1000

CMD ["node","/app/dist/index.js","start"]

COPY --from=builder /app/packages/webhook/dist/ /app/dist/
