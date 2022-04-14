const fs = require("fs-extra")
const yaml = require("js-yaml")

const getYamlPath = require("./get-yaml-path")

module.exports = async (...files) => {
  for (const f of files) {
    const file = await getYamlPath(f)
    if (file) {
      return yaml.load(await fs.readFile(file, { encoding: "utf-8" }))
    }
  }
}
