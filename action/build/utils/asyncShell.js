const { spawn } = require("child_process")

const nctx = require("nctx")

const globalLogger = require("./logger")

const ctx = nctx.create("asyncShell")

const promiseFromChildProcess = (child) => {
  const logger = ctx.get("logger") || globalLogger

  const out = []
  child.stdout.on("data", (data) => {
    out.push(data)
  })
  const err = []
  child.stderr.on("data", (data) => {
    if (data.includes("found symbolic link")) {
      return
    }
    err.push(data)
  })
  return new Promise(function (resolve, reject) {
    child.on("close", (code) => {
      if (code === 0) {
        if (err.length > 0) {
          logger.warn(err.join())
        }
        resolve(out.join())
      } else {
        reject(err.join())
      }
    })
  })
}

const asyncShell = (arg, options = {}) => {
  if (typeof arg === "string") {
    arg = arg.split(" ").filter((a) => !!a)
  }
  const [cmd, ...args] = arg
  const defaultOptions = { encoding: "utf8" }
  const childProcess = spawn(cmd, args, { ...defaultOptions, ...options })
  return promiseFromChildProcess(childProcess)
}

module.exports = asyncShell
module.exports.ctx = ctx
