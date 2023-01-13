module.exports = class ExitError extends Error {
  constructor(error, exitCode = 1) {
    super(error.message)
    this.error = error
    this.exitCode = exitCode
  }
}
