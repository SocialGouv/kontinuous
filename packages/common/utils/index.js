const exportDirModules = require("./export-dir-modules")

module.exports = {
  ...exportDirModules(__dirname, {
    filter: (file) => file !== "index.js",
  }),
  degit: require("tiged2"),
  fs: require("fs-extra"),
}
