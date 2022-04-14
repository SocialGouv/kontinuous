const { spawn } = require("child_process")

const globalLogger = require("./logger")
const parseCommand = require("./parse-command")

const promiseFromChildProcess = (child, callback, logger) => {
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
  return new Promise(async (resolve, reject) => {
    if (callback) {
      await callback(child)
    }
    child.on("close", (code) => {
      if (code === 0) {
        if (err.length > 0) {
          logger.warn(err.join())
        }
        resolve(Buffer.concat(out).toString())
      } else {
        reject(err.join())
      }
    })
  })
}

module.exports = (
  arg,
  options = {},
  callback = null,
  logger = globalLogger
) => {
  const [cmd, args] = parseCommand(arg)
  const defaultOptions = { encoding: "utf8" }
  const childProcess = spawn(cmd, args, { ...defaultOptions, ...options })
  return promiseFromChildProcess(childProcess, callback, logger)
}
