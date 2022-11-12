const path = require("path")

process.env.TS_NODE_PROJECT = path.resolve(`${__dirname}/../tsconfig.json`)

const { register } = require("ts-node")

register({
  transpileOnly: process.env.KS_TS_NODE_TRANSPILE_ONLY === "true",
})
