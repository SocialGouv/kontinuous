// https://docs.sentry.io/platforms/node/guides/express/

module.exports = function () {
  return [
    async (_req, _res) => {
      throw new Error("Sentry error!")
    },
  ]
}
