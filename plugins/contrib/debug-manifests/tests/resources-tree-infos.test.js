const path = require("path")
const fs = require("fs-extra")
const resourceTreeInfos = require("../01-resources-tree-infos")

// const tests = [
//   {
//     title: "test2",
//     manifests: [
//       {
//         kind: "Ingress",
//       },
//     ],
//   },
// ]

const samples = ["egapro"]

samples.forEach((sample) => {
  test(`${sample}`, async () => {
    const ctx = require("~common/ctx")
    const utils = require("~common/utils")
    const rawYaml = await fs.readFile(
      path.join(__dirname, `./samples/${sample}.yaml`),
      {
        encoding: "utf-8",
      }
    )
    const manifests = utils.yaml.loadAll(rawYaml)
    utils.logger.configureDebug(true)
    ctx.provide()
    ctx.set("logger", utils.logger)
    const spy = jest.spyOn(utils.logger, "debug")
    resourceTreeInfos(
      manifests,
      {},
      {
        ctx,
        utils,
      }
    )
    expect(spy.mock.calls[0][0]).toMatchSnapshot()
  })
})

// test("Example", async () => {
//   const ctx = require("~common/ctx")
//   const utils = require("~common/utils")
//   utils.logger.configureDebug(true)
//   ctx.provide()
//   ctx.set("logger", utils.logger)
//   const spy = jest.spyOn(utils.logger, "debug")
//   resourceTreeInfos(
//     manifests,
//     {},
//     {
//       ctx,
//       utils,
//     }
//   )
//   expect(spy.mock.calls[0][0]).toMatchSnapshot()
// })
