const slug = require("~common/utils/slug")
const ctx = require("~common/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("slugify-subdomain")
    .alias("slug-subdomain")
    .description("Generate slug subdomain")
    .argument("[prefix]", "prefix of url, generally component name")
    .addOption(options.repository)
    .addOption(options.branch)
    .option("--repository-name <repo-name>", "override repository name")
    .action(async (...args) => {
      const _command = args.pop()
      const opts = args.pop()
      const [prefix] = args

      const config = ctx.require("config")

      let { repositoryName } = opts
      if (!repositoryName) {
        ;({ repositoryName } = config)
      }
      const { gitBranch } = config

      let url = slug([repositoryName, gitBranch].join("-"))
      if (prefix) {
        url = slug([prefix, url].join("-"))
      }

      process.stdout.write(url)
    })
