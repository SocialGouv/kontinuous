#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  SocialGouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml