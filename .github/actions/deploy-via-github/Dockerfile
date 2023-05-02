FROM ghcr.io/socialgouv/kontinuous:v1.147.15

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# see https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#user
USER 0

RUN ln -s /opt/kontinuous/dist/index.js /usr/local/bin/kontinuous