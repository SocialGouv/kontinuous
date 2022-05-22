#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  SocialGouv/kontinuous: ${GITHUB_ACTION_PATH}/kontinuous
  SocialGouv/kontinuous/plugins/recommended: ${GITHUB_ACTION_PATH}/plugins/recommended
  SocialGouv/kontinuous/plugins/fabrique: ${GITHUB_ACTION_PATH}/plugins/fabrique
" > $HOME/.kontinuous/config.yaml