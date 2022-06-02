const { spawn } = require("child_process")

module.exports = () =>
  new Promise(async (res) => {
    const child = spawn("java", ["-version"])
    child.on("error", () => res(false))
    child.stderr.on("data", (data) => {
      // eslint-disable-next-line prefer-destructuring
      data = data.toString().split("\n")[0]
      const javaVersion = /version/.test(data)
        ? data.split(" ")[2].replace(/"/g, "")
        : false
      res(javaVersion || false)
    })
  })
