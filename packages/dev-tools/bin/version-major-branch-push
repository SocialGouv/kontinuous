#!/bin/bash
set -e

MAJOR_VERSION=$(git describe --tags $(git rev-list --tags --max-count=1) | cut -d '.' -f 1)
git push -f origin $MAJOR_VERSION
