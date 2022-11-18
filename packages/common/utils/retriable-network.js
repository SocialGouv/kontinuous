const retriableMatch = require("./retriable-match")

const errorsMapping = [
  {
    includes:
      "Unable to connect to the server: net/http: TLS handshake timeout",
    message: `kubectl network error(net/http: TLS handshake timeout)`,
  },
  {
    includes: "timeout",
    message: `kubectl network error(timeout stuff)`,
  },
  {
    includes: "the server doesn't have a resource type",
    message: `kubectl api resource type error`,
  },
]
module.exports = (err) => retriableMatch(err, errorsMapping)
