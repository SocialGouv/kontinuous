FROM ghcr.io/socialgouv/kontinuous:1

RUN npm i -g @socialgouv/parse-manifests

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]