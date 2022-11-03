ARG UBUNTU_VERSION=22.04

FROM ubuntu:$UBUNTU_VERSION as downloader
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    curl \
    ca-certificates \
    wget \
    git \
  && rm -rf /var/lib/apt/lists/*

FROM downloader as kubectl
ARG KUBECTL_VERSION=v1.25.0
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl --fail -sL https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

FROM downloader as helm
ARG HELM_VERSION=v3.9.3
ENV HELM_VERSION=$HELM_VERSION
RUN curl --fail -sL https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar xz -C /tmp/ \
  && mv /tmp/linux-amd64/helm /usr/local/bin/helm \
  && chmod +x /usr/local/bin/helm \
  && rm -r /tmp/linux-amd64

FROM downloader as kapp
ARG KAPP_VERSION=v0.52.0
ENV KAPP_VERSION=$KAPP_VERSION
RUN curl --fail -sL https://github.com/vmware-tanzu/carvel-kapp/releases/download/${KAPP_VERSION}/kapp-linux-amd64 > /tmp/kapp \
  && mv /tmp/kapp /usr/local/bin/kapp \
  && chmod +x /usr/local/bin/kapp

FROM downloader as rollout-status
ARG ROLLOUT_STATUS_VERSION=v1.10.0
ENV ROLLOUT_STATUS_VERSION=$ROLLOUT_STATUS_VERSION
RUN curl --fail -sL https://github.com/SocialGouv/rollout-status/releases/download/${ROLLOUT_STATUS_VERSION}/rollout-status-${ROLLOUT_STATUS_VERSION}-linux-amd64 > /tmp/rollout-status \
  && mv /tmp/rollout-status /usr/local/bin/rollout-status \
  && chmod +x /usr/local/bin/rollout-status

FROM downloader as stern
ARG STERN_VERSION=1.11.0
ENV STERN_VERSION=$STERN_VERSION
RUN curl --fail -sL https://github.com/wercker/stern/releases/download/${STERN_VERSION}/stern_linux_amd64 > /tmp/stern \
  && mv /tmp/stern /usr/local/bin/stern \
  && chmod +x /usr/local/bin/stern

FROM ubuntu:$UBUNTU_VERSION as node
ARG NODE_VERSION=18
ENV NODE_VERSION=$NODE_VERSION
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    ca-certificates \
    git \
    libgraph-easy-perl \
    && rm -rf /var/lib/apt/lists/*
RUN apt-get update && \
  apt-get install -yq --no-install-recommends \
    wget \
    && wget -qO- https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install nodejs \
    && npm install -g yarn \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM node as packages
COPY --chown=1001:1001 package.json yarn.lock .yarnrc.yml ./
COPY --chown=1001:1001 .yarn .yarn
COPY --chown=1001:1001 packages/kontinuous/package.json ./packages/kontinuous/package.json
COPY --chown=1001:1001 packages/common/package.json ./packages/common/package.json

# Keep yarn install cache when bumping version and dependencies still the sames
RUN node -e " \
  const package = JSON.parse(fs.readFileSync('package.json')); \
  const packageZero = { ...package, version: '0.0.0' };  \
  fs.writeFileSync('package.json', JSON.stringify(packageZero));"
RUN node -e " \
  const package = JSON.parse(fs.readFileSync('packages/kontinuous/package.json')); \
  const packageZero = { ...package, version: '0.0.0' };  \
  fs.writeFileSync('packages/kontinuous/package.json', JSON.stringify(packageZero));"
RUN node -e " \
  const package = JSON.parse(fs.readFileSync('packages/common/package.json')); \
  const packageZero = { ...package, version: '0.0.0' };  \
  fs.writeFileSync('packages/common/package.json', JSON.stringify(packageZero));"

FROM node as plugins
# pre-cache yarn package for official local plugins optimization
COPY --chown=1001:1001 plugins/ /app/plugins/
RUN \
  cd /app/plugins/contrib && yarn  && \
  cd /app/plugins/fabrique && yarn && \
  yarn cache clean

FROM node as cli

RUN groupadd -g 1001 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1001 ubuntu
RUN mkdir -p /opt && chown 1001:1001 /opt

RUN mkdir -p /workspace && chown 1001:1001 /workspace
RUN mkdir -p /opt/kontinuous && chown 1001:1001 /opt/kontinuous

RUN mkdir /yarn
RUN chown 1001:1001 /yarn
ENV YARN_CACHE_FOLDER /yarn

ENV HOME=/home/ubuntu
RUN chmod a+rw $HOME
RUN git config --global --add safe.directory /workspace
ENV KUBECONFIG=$HOME/.kube/config
RUN mkdir $HOME/.kube

ENV KS_INLINE_CONFIG_SET "links.SocialGouv/kontinuous=/opt/kontinuous"
ENV KS_EXTERNAL_BIN_FORCE_DOWNLOAD "false"

ENTRYPOINT ["/opt/kontinuous/packages/kontinuous/bin/kontinuous"]
CMD ["help"]

USER 1001

COPY --from=kubectl /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=helm /usr/local/bin/helm /usr/local/bin/helm
COPY --from=kapp /usr/local/bin/kapp /usr/local/bin/kapp
COPY --from=rollout-status /usr/local/bin/rollout-status /usr/local/bin/rollout-status
COPY --from=stern /usr/local/bin/stern /usr/local/bin/stern

WORKDIR /opt/kontinuous

RUN mkdir -p packages/kontinuous/src && mkdir -p packages/kontinuous/common
COPY --from=packages --chown=1001:1001 /app/package.json ./package.json
COPY --from=packages --chown=1001:1001 /app/yarn.lock ./yarn.lock
COPY --from=packages --chown=1001:1001 /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=packages --chown=1001:1001 /app/.yarn ./.yarn
COPY --from=packages --chown=1001:1001 /app/packages/kontinuous/package.json ./packages/kontinuous/package.json
COPY --from=packages --chown=1001:1001 /app/packages/common/package.json ./packages/common/package.json

RUN yarn workspaces focus kontinuous --production && yarn cache clean

COPY --from=plugins --chown=1001:1001 /app/plugins/ ./plugins/

COPY --chown=1001:1001 packages/kontinuous/ ./packages/kontinuous/
COPY --chown=1001:1001 packages/common/ ./packages/common/

WORKDIR /workspace