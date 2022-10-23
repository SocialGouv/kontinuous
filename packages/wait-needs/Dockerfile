ARG NODE_VERSION=18

FROM node:$NODE_VERSION as downloader
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM downloader as rollout-status
ARG ROLLOUT_STATUS_VERSION=v1.9.2
ENV ROLLOUT_STATUS_VERSION=$ROLLOUT_STATUS_VERSION
RUN curl -sL https://github.com/SocialGouv/rollout-status/releases/download/${ROLLOUT_STATUS_VERSION}/rollout-status-${ROLLOUT_STATUS_VERSION}-linux-amd64 > /tmp/rollout-status \
  && mv /tmp/rollout-status /usr/local/bin/rollout-status \
  && chmod +x /usr/local/bin/rollout-status

FROM node:$NODE_VERSION

RUN groupadd -g 1001 ubuntu && useradd -rm -d /home/ubuntu -s /bin/bash -g ubuntu -G sudo -u 1001 ubuntu
RUN mkdir -p /opt/wait-needs && chown -R 1001:1001 /opt

USER 1001

COPY --from=rollout-status /usr/local/bin/rollout-status /usr/local/bin/rollout-status

WORKDIR /opt/wait-needs

COPY --chown=1001:1001 package.json yarn.lock .yarnrc.yml ./
COPY --chown=1001:1001 .yarn .yarn
COPY --chown=1001:1001 packages/wait-needs/package.json ./packages/wait-needs/package.json
COPY --chown=1001:1001 packages/common/package.json ./packages/common/package.json

RUN yarn workspaces focus wait-needs && yarn cache clean

CMD ["packages/wait-needs/bin/wait-needs"]
COPY packages/wait-needs/ packages/wait-needs/
COPY packages/common/ packages/common/