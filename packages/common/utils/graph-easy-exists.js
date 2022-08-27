const { spawn } = require("child_process")

module.exports = () =>
  new Promise(async (res) => {
    const child = spawn("graph-easy", ["--version"])
    let exists
    child.on("error", () => {
      exists = false
    })
    child.stdout.on("data", () => {
      exists = true
    })
    child.on("close", () => {
      res(exists)
    })
  })
