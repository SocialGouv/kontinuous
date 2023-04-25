const path = require("path")

const fs = require("fs-extra")

const deepmerge = require("~common/utils/deepmerge")
const yaml = require("~common/utils/yaml")

const yamlExtends = async ({ dir, values }) => {
  let extendsFiles = values["~extends"]
  if (!Array.isArray(extendsFiles)) {
    extendsFiles = [extendsFiles]
  }
  for (const extendsFile of extendsFiles) {
    if (extendsFile) {
      delete values["~extends"]
      const extendsPath = path.join(dir, extendsFile)
      const yamlContent = await fs.readFile(extendsPath, {
        encoding: "utf-8",
      })
      const extendsVal = yaml.load(yamlContent)
      await yamlExtends({
        dir: path.dirname(extendsPath),
        values: extendsVal,
      })
      deepmerge(values, extendsVal)
    }
  }
}

module.exports = yamlExtends
