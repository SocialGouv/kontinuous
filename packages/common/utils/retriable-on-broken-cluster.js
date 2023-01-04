const retriableMatch = require("./retriable-match")

const errorsMapping = [
  {
    includes: "no matches for kind",
    message: `server error(no matches for kind)`,
  },
  {
    includes:
      "error trying to reach service: dial tcp 10.0.0.1:443: connect: connection refused",
    message: `server error(connection refused)`,
  },
  {
    includes: "InternalError",
    message: `server error(InternalError)`,
  },
]
module.exports = (err) => retriableMatch(err, errorsMapping)
