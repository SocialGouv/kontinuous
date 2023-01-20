const { Writable } = require("node:stream")

const { Logger } = require("direct-logger")

class LogWriteStream extends Writable {
  constructor(options, logStreams, level) {
    super(options)
    this.logStreams = logStreams
    this.logLevel = level
  }

  // eslint-disable-next-line class-methods-use-this
  _write(chunk, encoding, callback) {
    this.logStreams.forEach((stream) => {
      if (stream instanceof Writable) {
        stream.write(chunk, encoding)
      } else {
        stream(chunk.toString(), { level: this.logLevel })
      }
    })
    callback()
  }
}

module.exports = (streams = [process.stderr], levels = Logger.levels) =>
  levels.map((level) => new LogWriteStream({}, streams, level))
