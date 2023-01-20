module.exports = class ProgramError extends Error {
  constructor(msg, code) {
    super(msg)
    this.code = code
  }
}
