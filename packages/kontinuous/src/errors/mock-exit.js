const ExitError = require("./exit-error")

module.exports = class MockExit extends ExitError {
  constructor(code, error = "MockExit") {
    if (typeof error === "string") {
      error = new Error(error)
    }
    super(error, code)
  }
}
