#!/bin/bash

mkdir -p $HOME/.kontinuous

echo "
links:
  socialgouv/kontinuous: ${GITHUB_WORKSPACE}
" > $HOME/.kontinuous/config.yaml