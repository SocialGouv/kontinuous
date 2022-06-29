module.exports = class ValidationError extends Error {
  constructor(message, data = {}) {
    super(message)
    this.name = "ValidationError"
    this.data = data
  }
}
