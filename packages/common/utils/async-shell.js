const { spawn } = require("child_process")

const getLogger = require("./get-logger")
const parseCommand = require("./parse-command")
const ProgramError = require("./program-error.class")

/**
 *
 * @param {import("child_process").ChildProcessWithoutNullStreams} child
 * @param {null | ((child: import("child_process").ChildProcessWithoutNullStreams) => void)} callback
 * @param {Kontinuous.PatchContext["logger"]} logger
 * @param {{ignoreErrors?: string[]}} extraOptions
 * @returns
 */

const promiseFromChildProcess = (child, callback, logger, extraOptions) => {
  const { ignoreErrors = [] } = extraOptions
  child.on("error", () => {}) // avoid crash on not found executable
  const out = []
  child.stdout.on("data", (data) => {
    out.push(data)
  })
  const err = []
  child.stderr.on("data", (data) => {
    if (ignoreErrors.some((errCatch) => data.includes(errCatch))) {
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
          logger.trace(err.join())
        }
        resolve(Buffer.concat(out).toString())
      } else {
        const error = new ProgramError(
          err.join() || Buffer.concat(out).toString(),
          code
        )
        logger.trace("error running command")
        reject(error)
      }
    })
  })
}

module.exports = (
  arg,
  options = {},
  callback = null,
  logger = getLogger(),
  extraOptions = {}
) => {
  const [cmd, args] = parseCommand(arg)
  const defaultOptions = { encoding: "utf-8" }
  const childProcess = spawn(cmd, args, {
    ...defaultOptions,
    ...options,
    env: { ...process.env, ...(options.env || {}) },
  })
  return promiseFromChildProcess(
    childProcess,
    callback,
    logger.child({ cmd, args }),
    extraOptions
  )
}
