const { spawn } = require("child_process")

module.exports = ({ kubeconfig, kubecontext, namespace, selector }) => {
  const args = []
  if (kubeconfig) {
    args.push(...["-kubeconfig", kubeconfig])
  }
  if (kubecontext) {
    args.push(...["-kubecontext", kubecontext])
  }
  if (namespace) {
    args.push(...["-namespace", namespace])
  }
  if (selector) {
    args.push(...["-selector", selector])
  }
  const proc = spawn("rollout-status", args, { encoding: "utf-8" })

  const out = []
  proc.stdout.on("data", (data) => {
    out.push(data)
  })

  const err = []
  proc.stderr.on("data", (data) => {
    err.push(data)
  })

  const promise = new Promise(async (resolve, reject) => {
    proc.on("close", (_code) => {
      const resultJson = Buffer.concat(out).toString()
      let result
      try {
        result = JSON.parse(resultJson)
        resolve(result)
      } catch (_err) {
        reject(Buffer.concat(err).toString())
      }
    })
  })

  return { process: proc, promise }
}
