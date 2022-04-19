#!/bin/bash

set -e

# This job is run directly after mon-web-unittest on centos7.
VERSION=0.1

if [ -z "$VERSION" ] ; then
  echo "You need to specify the VERSION variable"
  exit 1
fi

sonar-scanner -Dsonar.projectVersion="$VERSION"
