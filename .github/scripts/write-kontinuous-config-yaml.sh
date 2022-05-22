#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  SocialGouv/kontinuous: ${GITHUB_WORKSPACE}/kontinuous
  SocialGouv/kontinuous/plugins/recommended: ${GITHUB_WORKSPACE}/plugins/recommended
  SocialGouv/kontinuous/plugins/fabrique: ${GITHUB_WORKSPACE}/plugins/fabrique
" > $HOME/.kontinuous/config.yaml