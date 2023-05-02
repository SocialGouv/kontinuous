FROM ghcr.io/socialgouv/kontinuous:v1.147.11

COPY entrypoint.sh /entrypoint.sh
COPY kontinuous.sh /usr/local/bin/kontinuous

ENTRYPOINT ["/entrypoint.sh"]

# see https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#user
USER 0