module.exports = class DiffError extends Error {
  constructor(message, snapshotName) {
    super(message)
    this.snapshotName = snapshotName
  }
}
