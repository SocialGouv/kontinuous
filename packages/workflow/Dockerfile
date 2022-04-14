ARG UBUNTU_VERSION=20.04

FROM ubuntu:$UBUNTU_VERSION

RUN apt-get update && \
  apt-get install -y \
    curl \
    wget \
    git \
  && rm -rf /var/lib/apt/lists/*

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

ARG NODE_VERSION=17
ENV NODE_VERSION=$NODE_VERSION
RUN wget -qO- https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install nodejs \
  && npm install -g yarn \
  && rm -rf /var/lib/apt/lists/*

ARG KAPP_VERSION=v0.46.0
ENV KAPP_VERSION=$KAPP_VERSION
RUN curl -sL https://github.com/vmware-tanzu/carvel-kapp/releases/download/${KAPP_VERSION}/kapp-linux-amd64 > /tmp/kapp \
  && mv /tmp/kapp /usr/local/bin/kapp \
  && chmod +x /usr/local/bin/kapp

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1001 ubuntu
RUN mkdir -p /opt && chown 1001:1001 /opt

RUN mkdir -p /opt/kube-workflow
WORKDIR /opt/kube-workflow
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages/workflow/package.json ./packages/workflow/package.json
COPY packages/common/package.json ./packages/common/package.json
RUN chown -R 1001:1001 .

# Keep yarn install cache when bumping version and dependencies still the sames
RUN node -e " \
  const package = JSON.parse(fs.readFileSync('packages/workflow/package.json')); \
  const packageZero = { ...package, version: '0.0.0' };  \
  fs.writeFileSync('packages/workflow/package.json', JSON.stringify(packageZero));"
RUN node -e " \
  const package = JSON.parse(fs.readFileSync('packages/common/package.json')); \
  const packageZero = { ...package, version: '0.0.0' };  \
  fs.writeFileSync('packages/common/package.json', JSON.stringify(packageZero));"
RUN mkdir -p packages/workflow/src && mkdir -p packages/workflow/common
RUN yarn workspaces focus kube-workflow --production \
  && yarn cache clean
COPY packages/workflow/ ./packages/workflow/
COPY packages/common/ ./packages/common/

RUN chown -R 1001:1001 .
RUN mkdir -p /workspace
RUN chown -R 1001:1001 /workspace
WORKDIR /workspace

USER 1001
ENV HOME=/home/ubuntu
RUN chmod a+rw $HOME
ENV KUBECONFIG=$HOME/.kube/config
RUN mkdir $HOME/.kube
ENTRYPOINT ["/opt/kube-workflow/packages/workflow/bin/kube-workflow"]
CMD ["help"]