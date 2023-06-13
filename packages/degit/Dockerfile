# renovate: datasource=docker depName=ubuntu versioning=ubuntu
ARG UBUNTU_VERSION=22.04
FROM ubuntu:$UBUNTU_VERSION as base

RUN groupadd -g 1000 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1000 ubuntu

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
  ca-certificates \
  curl \
  git \
  && rm -rf /var/lib/apt/lists/*

# renovate: datasource=node depName=node versioning=node
ARG NODE_VERSION=20.3.0
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE
ENV NODE_PATH $NODE_HOME/lib/node_modules
ENV PATH $NODE_HOME/bin:$PATH
RUN curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/

RUN npm i -g tiged

USER 1000