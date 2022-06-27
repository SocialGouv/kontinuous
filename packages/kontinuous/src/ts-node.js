const path = require("path")
const { register } = require("ts-node")

process.env.TS_NODE_PROJECT = path.resolve(`${__dirname}/../tsconfig.json`)

register({
  transpileOnly: true,
})
