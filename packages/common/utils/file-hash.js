const crypto = require("crypto")
const fs = require("fs")

module.exports = (file) =>
  new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash("md5")
      const stream = fs.createReadStream(file)
      stream.on("data", (data) => {
        hash.update(data, "utf8")
      })

      stream.on("end", () => {
        resolve(hash.digest("hex"))
      })

      stream.on("error", (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
