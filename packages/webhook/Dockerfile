ARG NODE_VERSION=17-alpine
ARG NODE_ENV=production

FROM node:$NODE_VERSION as node

WORKDIR /app

## PREPARE (package.json to avoid node_modules cache invalidation on version bumpgin)
FROM node as preparation
COPY packages/webhook/package.json /app/packages/webhook/
RUN node -e "fs.writeFileSync('/app/packages/webhook/package.json', JSON.stringify({ ...JSON.parse(fs.readFileSync('/app/packages/webhook/package.json')), version: '0.0.0' }));"

## BUILD ENVIRONMENTS
FROM node as builder
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

### INSTALL (node modules)
COPY --from=preparation /app/packages/webhook/package.json /app/packages/webhook/
COPY package.json yarn.lock .eslintrc.yaml /app/
#### CUSTOM COPY LIBS
COPY libs/modjo/package.json /app/libs/modjo/
COPY libs/common/package.json /app/libs/common/
#### YARN INSTALL
RUN yarn --immutable --ignore-scripts

### COPY (package sources)
COPY packages/webhook /app/packages/webhook/

### CUSTOMS COPY (before build)
COPY libs/modjo /app/libs/modjo/
COPY libs/common /app/libs/common/

#### CUSTOMS ARG and ENV
# ARG FOO
# ENV FOO=$FOO

#### CUSTOMS RUN
RUN mkdir -p /app/packages/webhook/build


### RUN PREBUILD
RUN yarn workspace webhook postinstall

### CUSTOM RUN PREBUILD
RUN yarn workspace modjo postinstall

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