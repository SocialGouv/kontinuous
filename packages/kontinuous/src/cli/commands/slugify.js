const slug = require("~common/utils/slug")

module.exports = (program) =>
  program
    .command("slugify")
    .alias("slug")
    .description(
      "Generate slug from string compatible with kubernetes and dns naming"
    )
    .argument("<raw-string>", "the raw string to slugify")
    .action(async (rawString, _options, _command) => {
      process.stdout.write(slug(rawString))
    })
