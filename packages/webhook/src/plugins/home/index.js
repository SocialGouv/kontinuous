const { ctx } = require("@modjo/core")

module.exports = async () => {
  const app = ctx.require("express")
  app.get("/", async (_req, res) => res.redirect("/api/v1/swagger/"))
}
