module.exports = (error) =>
  error && // just to make sure
  !error.response && // if there is a response, it reached the server and not a network error
  error.code !== "ECONNABORTED" // check that it isn't a timeout
