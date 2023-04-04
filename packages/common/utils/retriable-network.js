const retriableMatch = require("./retriable-match")

const errorsMapping = [
  {
    includes: "net/http: TLS handshake timeout",
    message: `kubectl network error(net/http: TLS handshake timeout)`,
  },
  {
    includes: "net/http: request canceled",
    message: `kubectl network error(net/http: request canceled)`,
  },
  {
    // includes: "timeout",
    regex: /^(?!--)(.*timeout.*)$/,
    message: `kubectl network error(timeout stuff)`,
  },
  {
    includes: "the server doesn't have a resource type",
    message: `kubectl api resource type error`,
  },
  {
    includes: "INTERNAL_ERROR; received from peer",
    message: `kubectl network error(received from peer)`,
  },
]
module.exports = (err) => retriableMatch(err, errorsMapping)
