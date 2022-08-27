const interactive = require("./interactive")

module.exports = async (opts, _command) => {
  try {
    await interactive(opts)
  } catch (err) {
    if (err === "") {
      return
    }
    throw err
  }
}
