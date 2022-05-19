const exportDirModules = require("./export-dir-modules")

module.exports = exportDirModules(__dirname, {
  filter: (file) => file !== "index.js",
})
