const exportDirModules = require("./export-dir-modules")

module.exports = {
  ...exportDirModules(__dirname, {
    filter: (file) => file !== "index.js",
  }),
  degit: require("tiged"),
  fs: require("fs-extra"),
  get logger() {
    return require("./get-logger")()
  },
  needKubeconform: require("./need-kubeconform"),
}
