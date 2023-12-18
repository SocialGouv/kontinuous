const { spawn } = require("child_process")

/** @type {import(".").RolloutStatusExec} */
module.exports = ({
  kubeconfig,
  kubecontext,
  namespace,
  selector,
  kindFilter,
  pendingDeadLineSeconds,
  ignoreSecretNotFound,
  intervalSeconds = null,
  abortSignal,
}) => {
  const args = []
  if (kubeconfig) {
    args.push("-kubeconfig", kubeconfig)
  }
  if (kubecontext) {
    args.push("-kubecontext", kubecontext)
  }
  if (namespace) {
    args.push("-namespace", namespace)
  }
  if (selector) {
    args.push("-selector", selector)
  }
  if (ignoreSecretNotFound) {
    args.push("-ignore-secret-not-found")
  }
  if (intervalSeconds) {
    args.push(...["-interval", `${intervalSeconds}s`])
  }
  if (pendingDeadLineSeconds) {
    args.push(...["-pending-deadline", `${pendingDeadLineSeconds}`])
  }
  if (kindFilter) {
    args.push(...["-kind-filter", kindFilter.toLowerCase()])
  }
  const proc = spawn("rollout-status", args, {
    signal: abortSignal,
  })
  proc.on("error", () => {}) // avoid crash on not found executable

  const out = []
  proc.stdout.on("data", (data) => {
    out.push(data)
  })

  const err = []
  proc.stderr.on("data", (data) => {
    err.push(data)
  })

  const promise = new Promise(async (resolve, _reject) => {
    proc.on("close", (code) => {
      const resultStr = Buffer.concat(out).toString()
      let result
      try {
        // todo: type rollout status json
        result = JSON.parse(resultStr)
        resolve(result)
      } catch (_err) {
        const errStr = Buffer.concat(err).toString()
        resolve({ error: { reason: errStr || resultStr, code } })
      }
    })
  })

  return { process: proc, promise }
}
