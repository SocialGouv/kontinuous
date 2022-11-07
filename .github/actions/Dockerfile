FROM ghcr.io/socialgouv/kontinuous:v1.95.6 as base

USER 0
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    curl \
    ca-certificates \
    wget \
    git \
  && rm -rf /var/lib/apt/lists/*

FROM base as jq
ARG JQ_VERSION=1.6
ENV JQ_VERSION=$JQ_VERSION
RUN curl --fail -sL https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/jq-linux64 > /tmp/jq \
  && mv /tmp/jq /usr/local/bin/jq \
  && chmod +x /usr/local/bin/jq


FROM base as yq
ARG YQ_VERSION=4.20.2
ENV YQ_VERSION=$YQ_VERSION
RUN wget https://github.com/mikefarah/yq/releases/download/v$YQ_VERSION/yq_linux_amd64.tar.gz -O - | tar xz && mv yq_linux_amd64 /usr/local/bin/yq


FROM base as final

COPY --from=jq /usr/local/bin/jq /usr/local/bin/jq
COPY --from=yq /usr/local/bin/yq /usr/local/bin/yq

USER 1001

ENV NPM_CONFIG_PREFIX=/home/ubuntu/.npm-global
RUN npm i -g @socialgouv/parse-manifests