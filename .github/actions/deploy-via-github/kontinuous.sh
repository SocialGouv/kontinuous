#!/bin/sh
env | grep KS_
exec /opt/kontinuous/dist/index.js $@