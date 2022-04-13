ARG NODE_VERSION=17-alpine
ARG NODE_ENV=production

FROM node:$NODE_VERSION as node

WORKDIR /app

## PREPARE (package.json to avoid node_modules cache invalidation on version bumpgin)
FROM node as preparation
COPY packages/webhook/package.json /app/packages/webhook/
COPY packages/common/package.json /app/packages/common/
RUN node -e "fs.writeFileSync('/app/packages/webhook/package.json', JSON.stringify({ ...JSON.parse(fs.readFileSync('/app/packages/webhook/package.json')), version: '0.0.0' }));"
RUN node -e "fs.writeFileSync('/app/packages/common/package.json', JSON.stringify({ ...JSON.parse(fs.readFileSync('/app/packages/common/package.json')), version: '0.0.0' }));"

## BUILD ENVIRONMENTS
FROM node as builder
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

### INSTALL (node modules)
COPY --from=preparation /app/packages/webhook/package.json /app/packages/webhook/
COPY --from=preparation /app/packages/common/package.json /app/packages/common/
COPY yarn.lock .yarn /app/
#### YARN INSTALL
RUN yarn workspaces focus kube-workflow --ignore-scripts

### COPY (package sources)
COPY packages/webhook /app/packages/webhook/

### CUSTOMS COPY (before build)
COPY packages/common /app/packages/common/

#### CUSTOMS ARG and ENV
# ARG FOO
# ENV FOO=$FOO

#### CUSTOMS RUN
RUN mkdir -p /app/packages/webhook/build


### RUN PREBUILD
RUN yarn workspace webhook postinstall

### CUSTOM RUN PREBUILD

### RUN BUILD
RUN yarn workspace webhook build

# NODE PROJECT RUNNER
## SERVER
FROM node as server
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

USER node

CMD ["node","/app/dist/index.js","start"]

COPY --from=builder /app/packages/webhook/dist/ /app/dist/