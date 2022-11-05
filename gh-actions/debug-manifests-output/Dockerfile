FROM ghcr.io/socialgouv/kontinuous:1

ENV NPM_CONFIG_PREFIX=/home/ubuntu/.npm-global

RUN npm i -g @socialgouv/parse-manifests

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]