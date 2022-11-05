FROM ghcr.io/socialgouv/kontinuous:1

ARG JQ_VERSION=1.6
ENV JQ_VERSION=$JQ_VERSION
RUN curl --fail -sL https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/jq-linux64 > /tmp/jq \
  && mv /tmp/jq /usr/local/bin/jq \
  && chmod +x /usr/local/bin/jq

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]