const { spawn } = require("child_process")
const fs = require("fs-extra")

const openCurly = "{{"
const closeCurly = "}}"
const escapeCurlyGoTemplate = (str) => `{{ "${str}" }}`
const escapeCurlyGo = {
  [openCurly]: escapeCurlyGoTemplate(openCurly),
  [closeCurly]: escapeCurlyGoTemplate(closeCurly),
}

module.exports = async (
  options,
  { config, logger, needBin, utils, manifestsYaml, dryRun }
) => {
  const { parseCommand, needHelm, slug, createChart, yaml } = utils

  const { kubeconfigContext, kubeconfig, repositoryName } = config

  const charts = config.chart?.join(",")

  const helmRelease = slug(
    `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  )

  await needBin(needHelm)

  const manifestsDir = `${config.buildPath}/deploy-with/helm`
  await fs.ensureDir(`${manifestsDir}/templates`)

  const yamlManifests = manifestsYaml.replace(
    /\{\{|\}\}/g,
    (matched) => escapeCurlyGo[matched]
  )

  await Promise.all([
    fs.writeFile(`${manifestsDir}/templates/manifests.yaml`, yamlManifests),
    fs.writeFile(
      `${manifestsDir}/Chart.yaml`,
      yaml.dump(createChart(slug(repositoryName), {}))
    ),
  ])

  const { deployTimeout = "15m" } = options

  const helmDeployCommand = dryRun
    ? "helm version"
    : `
        helm upgrade
          ${helmRelease}
          ${manifestsDir}
          --install
          ${kubeconfigContext ? `--kube-context ${kubeconfigContext}` : ""}
          --force
          --timeout ${deployTimeout}
      `

  const [cmd, args] = parseCommand(helmDeployCommand)

  const proc = spawn(cmd, args, {
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
    },
  })

  proc.stdout.on("data", (data) => {
    process.stdout.write(data.toString())
  })
  proc.stderr.on("data", (data) => {
    logger.warn(data.toString())
  })

  return new Promise((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`helm deploy failed with exit code ${code}`))
      }
    })
  })
}
