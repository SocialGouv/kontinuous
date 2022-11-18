const retriableMatch = require("./retriable-match")

const errorsMapping = [
  {
    includes: "no matches for kind",
    message: `kubectl server error(no matches for kind)`,
  },
  {
    includes:
      "error trying to reach service: dial tcp 10.0.0.1:443: connect: connection refused",
    message: `kubectl server error(connection refused)`,
  },
  {
    includes: "InternalError",
    message: `kubectl server error(InternalError)`,
  },
]
module.exports = (err) => retriableMatch(err, errorsMapping)
