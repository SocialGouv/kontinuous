# renovate: datasource=node depName=node versioning=node
ARG NODE_VERSION=18.14.0
ARG UBUNTU_VERSION=22.04

FROM node:$NODE_VERSION as downloader
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
  curl \
  ca-certificates \
  wget \
  git \
  && rm -rf /var/lib/apt/lists/*

FROM downloader as kubectl
# renovate: datasource=github-tags depName=kubernetes/kubectl extractVersion=^kubernetes-(?<version>.+)$
ARG KUBECTL_VERSION=1.27.1
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl --fail -sL https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

FROM downloader as helm
# renovate: datasource=github-releases depName=helm/helm
ARG HELM_VERSION=3.11.3
ENV HELM_VERSION=$HELM_VERSION
RUN curl --fail -sL https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz | tar xz -C /tmp/ \
  && mv /tmp/linux-amd64/helm /usr/local/bin/helm \
  && chmod +x /usr/local/bin/helm \
  && rm -r /tmp/linux-amd64

# FROM downloader as kapp
# # renovate: datasource=github-releases depName=carvel-dev/kapp
# ARG KAPP_VERSION=0.54.3
# ENV KAPP_VERSION=$KAPP_VERSION
# RUN curl --fail -sL https://github.com/vmware-tanzu/carvel-kapp/releases/download/v${KAPP_VERSION}/kapp-linux-amd64 > /tmp/kapp \
#   && mv /tmp/kapp /usr/local/bin/kapp \
#   && chmod +x /usr/local/bin/kapp

FROM downloader as rollout-status
# renovate: datasource=github-releases depName=socialgouv/rollout-status
ARG ROLLOUT_STATUS_VERSION=1.13.4
ENV ROLLOUT_STATUS_VERSION=$ROLLOUT_STATUS_VERSION
RUN curl --fail -sL https://github.com/socialgouv/rollout-status/releases/download/v${ROLLOUT_STATUS_VERSION}/rollout-status-v${ROLLOUT_STATUS_VERSION}-linux-amd64 > /tmp/rollout-status \
  && mv /tmp/rollout-status /usr/local/bin/rollout-status \
  && chmod +x /usr/local/bin/rollout-status

FROM downloader as stern
# renovate: datasource=github-releases depName=stern/stern
ARG STERN_VERSION=1.25.0
ENV STERN_VERSION=$STERN_VERSION
RUN curl --fail -sL https://github.com/stern/stern/releases/download/v${STERN_VERSION}/stern_${STERN_VERSION}_linux_amd64.tar.gz | tar xz -C /tmp/ \
  && mv /tmp/stern /usr/local/bin/stern \
  && chmod +x /usr/local/bin/stern \
  && rm -r /tmp/*

FROM downloader as kubeconform
# renovate: datasource=github-releases depName=yannh/kubeconform
ARG KUBECONFORM_VERSION=0.6.1
ENV KUBECONFORM_VERSION=$KUBECONFORM_VERSION
RUN curl --fail -sL https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-amd64.tar.gz | tar xz -C /tmp/ \
  && mv /tmp/kubeconform /usr/local/bin/kubeconform \
  && chmod +x /usr/local/bin/kubeconform \
  && rm -r /tmp/*

FROM node:$NODE_VERSION as plugins
USER 1000
WORKDIR /app
# pre-cache yarn package for official local plugins optimization

COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn

RUN yarn fetch workspaces focus helm-tree --production && yarn cache clean

COPY --chown=1000:1000 \
  plugins/contrib/package.json plugins/contrib/yarn.lock plugins/contrib/.yarnrc.yml \
  /app/plugins/contrib/
COPY --chown=1000:1000 plugins/contrib/.yarn/ /app/plugins/contrib/.yarn/

COPY --chown=1000:1000 \
  plugins/fabrique/package.json plugins/fabrique/yarn.lock plugins/fabrique/.yarnrc.yml \
  /app/plugins/fabrique/
COPY --chown=1000:1000 plugins/fabrique/.yarn/ /app/plugins/fabrique/.yarn/

RUN \
  cd /app/plugins/contrib && yarn workspaces focus --production && \
  cd /app/plugins/fabrique && yarn workspaces focus --production && \
  yarn cache clean

COPY --chown=1000:1000 packages/helm-tree/ /app/packages/helm-tree/
COPY --chown=1000:1000 packages/common/ /app/packages/common/

COPY --chown=1000:1000 plugins/ /app/plugins/

RUN cd /app/plugins/contrib && /app/packages/helm-tree/bin/build-helm-tree
RUN cd /app/plugins/fabrique && /app/packages/helm-tree/bin/build-helm-tree

RUN yarn workspaces foreach -t run postinstall

FROM node:${NODE_VERSION} as build
USER 1000
WORKDIR /app

COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn

RUN yarn fetch workspaces focus kontinuous && yarn cache clean

COPY --chown=1000:1000 packages/kontinuous/ ./packages/kontinuous/
COPY --chown=1000:1000 packages/common/ ./packages/common/
COPY --chown=1000:1000 packages/helm-tree/ ./packages/helm-tree/

RUN mkdir -p packages/kontinuous/src

RUN yarn workspaces foreach -t run postinstall
RUN yarn workspace kontinuous build

FROM ubuntu:$UBUNTU_VERSION as program

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
  ca-certificates \
  curl \
  git \
  libgraph-easy-perl \
  && rm -rf /var/lib/apt/lists/*

ARG NODE_VERSION
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE

ENV NODE_PATH $NODE_HOME/lib/node_modules
ENV PATH $NODE_HOME/bin:$PATH

RUN curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/
RUN npm i -g yarn

WORKDIR /app

RUN groupadd -g 1000 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1000 ubuntu

RUN chown 1000:1000 /app

RUN mkdir -p /opt && chown 1000:1000 /opt

RUN mkdir -p /workspace && chown 1000:1000 /workspace
RUN mkdir -p /opt/kontinuous && chown 1000:1000 /opt/kontinuous

RUN mkdir /yarn
RUN chown 1000:1000 /yarn
ENV YARN_CACHE_FOLDER /yarn

ENV HOME=/home/node
RUN mkdir $HOME
RUN chmod a+rw $HOME
RUN git config --global --add safe.directory /workspace
RUN mkdir $HOME/.kube

ENV KS_INLINE_CONFIG_SET "links.socialgouv/kontinuous=/opt/kontinuous"
ENV KS_EXTERNAL_BIN_FORCE_DOWNLOAD "false"
ENV KS_HOMEDIR=/home/node/.kontinuous

COPY --from=kubectl /usr/local/bin/kubectl /usr/local/bin/kubectl
COPY --from=helm /usr/local/bin/helm /usr/local/bin/helm
# COPY --from=kapp /usr/local/bin/kapp /usr/local/bin/kapp
COPY --from=rollout-status /usr/local/bin/rollout-status /usr/local/bin/rollout-status
COPY --from=stern /usr/local/bin/stern /usr/local/bin/stern
COPY --from=kubeconform /usr/local/bin/kubeconform /usr/local/bin/kubeconform

WORKDIR /opt/kontinuous

COPY --from=build /app/packages/kontinuous/dist/ ./dist
RUN ln -s /opt/kontinuous/dist/index.js /usr/local/bin/kontinuous
ENTRYPOINT ["kontinuous"]
CMD ["help"]

COPY --from=plugins --chown=1000:1000 /app/plugins/ ./plugins/
COPY --from=plugins --chown=1000:1000 /home/node/.kontinuous/cache/ /home/node/.kontinuous/cache/

WORKDIR /workspace
USER 1000