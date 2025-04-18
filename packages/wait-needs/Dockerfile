# renovate: datasource=node depName=node versioning=node
ARG NODE_VERSION=20

FROM node:$NODE_VERSION as downloader
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM downloader as rollout-status
# renovate: datasource=github-releases depName=socialgouv/rollout-status
ARG ROLLOUT_STATUS_VERSION=1.13.6
ENV ROLLOUT_STATUS_VERSION=$ROLLOUT_STATUS_VERSION
RUN curl --fail -sL https://github.com/socialgouv/rollout-status/releases/download/v${ROLLOUT_STATUS_VERSION}/rollout-status-v${ROLLOUT_STATUS_VERSION}-linux-amd64 > /tmp/rollout-status \
  && mv /tmp/rollout-status /usr/local/bin/rollout-status \
  && chmod +x /usr/local/bin/rollout-status

FROM downloader as kubectl
# renovate: datasource=github-tags depName=kubernetes/kubectl extractVersion=^kubernetes-(?<version>.+)$
ARG KUBECTL_VERSION=1.27.1
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl --fail -sL https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

FROM node:$NODE_VERSION-alpine

RUN mkdir -p /opt/wait-needs && chown -R 1000:1000 /opt

USER 1000

COPY --from=rollout-status /usr/local/bin/rollout-status /usr/local/bin/rollout-status
COPY --from=kubectl /usr/local/bin/kubectl /usr/local/bin/kubectl

WORKDIR /opt/wait-needs

COPY --chown=1000:1000 yarn.lock .yarnrc.yml ./
COPY --chown=1000:1000 .yarn .yarn

RUN yarn fetch workspaces focus wait-needs && yarn cache clean

CMD ["packages/wait-needs/bin/wait-needs"]
COPY packages/wait-needs/ packages/wait-needs/
COPY packages/common/ packages/common/

RUN yarn workspaces foreach -t run postinstall