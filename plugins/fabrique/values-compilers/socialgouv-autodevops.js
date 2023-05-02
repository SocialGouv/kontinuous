module.exports = async (values, _options, { config, utils }) => {
  const { deepmerge, fs, yaml } = utils

  const { workspacePath } = config

  const yamlFile = `${workspacePath}/.socialgouv.yaml`
  const jsFile = `${workspacePath}/.socialgouv.js`

  const autodevops = {}
  let autodevopsEnabled = false

  if (await fs.pathExists(yamlFile)) {
    const autodevopsYaml = await fs.readFile(yamlFile, { encoding: "utf-8" })
    const autodevopsDef = yaml.load(autodevopsYaml)
    deepmerge(autodevops, autodevopsDef)
    autodevopsEnabled = true
  }
  if (await fs.pathExists(jsFile)) {
    const autodevopsDef = require(jsFile)
    deepmerge(autodevops, autodevopsDef)
    autodevopsEnabled = true
  }

  if (!autodevopsEnabled) {
    return
  }

  const autodevopsValues = {
    app: {
      enabled: true,
      "~chart": "app",
      "~needs": ["build-app"],
      containerPort: 8080,
    },
    jobs: {
      enabled: true,
      "~chart": "jobs",
      runs: {
        "build-app": {
          use: "build",
          with: {
            imagePackage: "app",
          },
        },
      },
    },
  }

  values = deepmerge(autodevopsValues, values)

  return values
}
