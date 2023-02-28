#!/bin/bash
stash() {
  # check if we have uncommited changes to stash
  git status --porcelain | grep "^." >/dev/null
  if [ $? -eq 0 ]; then
    if git stash save -u "git-update on `date`"; then
      stash=1
    fi
  fi
}
unstash() {
  # check if we have uncommited change to restore from the stash
  if [ $stash -eq 1 ]; then
    git stash pop;
  fi
}
stash=0
stash
branch=`git branch | grep "\*" | cut -d " " -f 2-9`

set -e
MAJOR_VERSION=$(git describe --tags $(git rev-list --tags --max-count=1) | cut -d '.' -f 1)
git branch -f $MAJOR_VERSION master # reset major version to current
git checkout $MAJOR_VERSION || git checkout -b $MAJOR_VERSION
yarn version-e2e
git add --all
git commit -m "chore: link major version branch to $MAJOR_VERSION"
set +e

git checkout $branch
unstash
