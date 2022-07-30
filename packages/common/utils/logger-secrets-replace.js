const { Transform } = require("stream")
const { isMainThread } = require("worker_threads")

const abstractTransport = require("pino-abstract-transport")
const pump = require("pump")
// const pretty = require("pino-pretty")
const { prettyFactory } = require("pino-pretty")
const SonicBoom = require("sonic-boom")

function noop() {}

function setupOnExit(stream) {
  /* istanbul ignore next */
  if (global.WeakRef && global.WeakMap && global.FinalizationRegistry) {
    // This is leak free, it does not leave event handlers
    const onExit = require("on-exit-leak-free")

    onExit.register(stream, autoEnd)

    stream.on("close", () => {
      onExit.unregister(stream)
    })
  }
}

function buildSafeSonicBoom(opts) {
  const stream = new SonicBoom(opts)
  function filterBrokenPipe(err) {
    if (err.code === "EPIPE") {
      stream.write = noop
      stream.end = noop
      stream.flushSync = noop
      stream.destroy = noop
      return
    }
    stream.removeListener("error", filterBrokenPipe)
  }
  stream.on("error", filterBrokenPipe)
  // if we are sync: false, we must flush on exit
  if (!opts.sync && isMainThread) {
    setupOnExit(stream)
  }
  return stream
}

function build(opts = {}) {
  const { secrets = [], hideCharsCount = false, prettyOptions = {} } = opts
  const pretty = prettyFactory(prettyOptions)
  return abstractTransport(
    (source) => {
      const stream = new Transform({
        objectMode: true,
        autoDestroy: true,
        transform(chunk, _enc, cb) {
          for (const secret of secrets) {
            chunk = chunk.replaceAll(
              secret,
              hideCharsCount ? "***" : "*".repeat(secret.length)
            )
          }
          let line
          if (opts.pretty) {
            line = pretty(chunk)
          } else {
            line = chunk
          }
          cb(null, line)
        },
      })

      let destination

      if (
        typeof opts.destination === "object" &&
        typeof opts.destination.write === "function"
      ) {
        destination = opts.destination
      } else {
        destination = buildSafeSonicBoom({
          dest: opts.destination || 1,
          append: opts.append,
          mkdir: opts.mkdir,
          sync: opts.sync, // by default sonic will be async
        })
      }

      source.on("unknown", (line) => {
        destination.write(`${line}\n`)
      })

      pump(source, stream, destination)
      return stream
    },
    { parse: "lines" }
  )
}

module.exports.default = build
