const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = () => (req) =>
  reqCtx.get("project") || req.query.project || req.body.project
