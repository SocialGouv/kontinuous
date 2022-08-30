const crypto = require("crypto")
const fs = require("fs-extra")

const createChart = require("./create-chart")

const asyncShell = require("./async-shell")
const yaml = require("./yaml")

module.exports = async (snippet, { dir, values }) => {
  const valuesYaml = yaml.dump(values)

  const hash = crypto
    .createHash("md5")
    .update(
      JSON.stringify({
        snippet,
        valuesYaml,
      }),
      "binary"
    )
    .digest("hex")
  const snippetDir = `${dir}/${hash}`

  await fs.ensureDir(`${snippetDir}/templates`)
  await fs.writeFile(
    `${snippetDir}/templates/snippet.yaml`,
    yaml.dump({ snippet })
  )

  const chartFile = `${snippetDir}/Chart.yaml`
  await fs.writeFile(chartFile, yaml.dump(createChart("tpl")))

  await fs.writeFile(`${snippetDir}/values.yaml`, valuesYaml)
  const resultYaml = await asyncShell(
    "helm template .",
    { cwd: snippetDir },
    (proc) => {
      proc.stdin.write(snippet)
      proc.stdin.end()
    }
  )
  const [{ snippet: result }] = yaml.loadAll(resultYaml)
  return result
}
