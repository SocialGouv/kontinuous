ARG UBUNTU_VERSION=20.04

FROM ubuntu:$UBUNTU_VERSION as base

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq \
    curl \
    wget \
    git \
    openjdk-17-jre-headless \
  && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME /usr/lib/jvm/java-17-openjdk-amd64/

ARG KUBECTL_VERSION=v1.23.4
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl -sL https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

ARG HELM_VERSION=v3.7.2
ENV HELM_VERSION=$HELM_VERSION
RUN curl -sL https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar xz -C /tmp/ \
  && mv /tmp/linux-amd64/helm /usr/local/bin/helm \
  && chmod +x /usr/local/bin/helm \
  && rm -r /tmp/linux-amd64

ARG NODE_VERSION=18
ENV NODE_VERSION=$NODE_VERSION
RUN wget -qO- https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install nodejs \
  && npm install -g yarn \
  && rm -rf /var/lib/apt/lists/*

ARG KAPP_VERSION=v0.49.0
ENV KAPP_VERSION=$KAPP_VERSION
RUN curl -sL https://github.com/vmware-tanzu/carvel-kapp/releases/download/${KAPP_VERSION}/kapp-linux-amd64 > /tmp/kapp \
  && mv /tmp/kapp /usr/local/bin/kapp \
  && chmod +x /usr/local/bin/kapp

RUN groupadd -g 1001 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1001 ubuntu
RUN mkdir -p /opt && chown 1001:1001 /opt

RUN mkdir -p /opt/kontinuous
WORKDIR /opt/kontinuous


FROM base as packages

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

FROM base as server

RUN mkdir -p /workspace
RUN chown 1001:1001 /workspace

RUN mkdir /yarn
RUN chown 1001:1001 /yarn
ENV YARN_CACHE_FOLDER /yarn

RUN chown -R 1001:1001 .

USER 1001

RUN mkdir -p packages/kontinuous/src && mkdir -p packages/kontinuous/common

COPY --from=packages --chown=1001:1001 /opt/kontinuous/package.json /opt/kontinuous/package.json
COPY --from=packages --chown=1001:1001 /opt/kontinuous/yarn.lock /opt/kontinuous/yarn.lock
COPY --from=packages --chown=1001:1001 /opt/kontinuous/.yarnrc.yml /opt/kontinuous/.yarnrc.yml
COPY --from=packages --chown=1001:1001 /opt/kontinuous/.yarn /opt/kontinuous/.yarn
COPY --from=packages --chown=1001:1001 /opt/kontinuous/packages/kontinuous/package.json /opt/kontinuous/packages/kontinuous/package.json
COPY --from=packages --chown=1001:1001 /opt/kontinuous/packages/common/package.json /opt/kontinuous/packages/common/package.json

RUN yarn workspaces focus kontinuous --production && yarn cache clean

# pre-cache yarn package for official plugins optimization
ENV KS_INLINE_CONFIG_SET "links.SocialGouv/kontinuous=/opt/kontinuous"
COPY --chown=1001:1001 plugins/ ./plugins/
RUN cd plugins/recommended && yarn
RUN cd plugins/fabrique && yarn

RUN rm -rf packages/kontinuous/src && rm -rf packages/kontinuous/common
COPY --chown=1001:1001 packages/kontinuous/ ./packages/kontinuous/
COPY --chown=1001:1001 packages/common/ ./packages/common/

WORKDIR /workspace

ENV HOME=/home/ubuntu
RUN chmod a+rw $HOME
RUN git config --global --add safe.directory /workspace
ENV KUBECONFIG=$HOME/.kube/config
RUN mkdir $HOME/.kube
ENTRYPOINT ["/opt/kontinuous/packages/kontinuous/bin/kontinuous"]
CMD ["help"]