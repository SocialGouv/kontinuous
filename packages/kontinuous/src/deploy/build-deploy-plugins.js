const recurseDependency = require("~common/config/recurse-dependencies")

const ctx = require("~common/ctx")
const buildJsFile = require("~/plugins/build-js-file")
const installPackages = require("~/plugins/install-packages")

module.exports = async () => {
  const config = ctx.require("config")
  await recurseDependency({
    config,
    afterChildren: async ({ target, definition }) => {
      await buildJsFile(target, "pre-deploy", definition)
      await buildJsFile(target, "post-deploy", definition)
      await buildJsFile(target, "deploy-sidecars", definition)
      await buildJsFile(target, "deploy", definition)
    },
  })
  await installPackages(config)
}
