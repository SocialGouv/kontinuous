FROM ghcr.io/socialgouv/kontinuous:v1.147.13

COPY entrypoint.sh /entrypoint.sh
RUN ln -s /opt/kontinuous/dist/index.js /usr/local/bin/kontinuous

ENTRYPOINT ["/entrypoint.sh"]

# see https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#user
USER 0