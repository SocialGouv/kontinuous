const janitor = require("../30-janitor")

const rawNs = `
apiVersion: v1
kind: Namespace
metadata:
  name: some-ns
`

const runJanitor = (config, values) => {
  const ctx = require("~common/ctx")
  const utils = require("~common/utils")

  const manifests = utils.yaml.loadAll(rawNs)
  utils.logger.configureDebug(true)
  ctx.provide()
  ctx.set("logger", utils.logger)
  return janitor(
    manifests,
    {},
    {
      config,
      values,
      ctx,
      utils,
    }
  )
}

test(`add janitor annotation in dev`, async () => {
  const result = runJanitor({ environment: "dev" })
  expect(result[0].metadata.annotations["janitor/ttl"]).toEqual("7d")
})

test(`add custom janitor annotation in dev`, async () => {
  const result = runJanitor({ environment: "dev" }, { ttl: "24h" })
  expect(result[0].metadata.annotations["janitor/ttl"]).toEqual("24h")
})

test(`DONT add janitor annotation in preprod`, async () => {
  const result = runJanitor({ environment: "preprod" })
  expect(() => result[0].metadata.annotations["janitor/ttl"]).toThrow()
})

test(`DONT add janitor annotation in prod`, async () => {
  const result = runJanitor({ environment: "prod" })
  expect(() => result[0].metadata.annotations["janitor/ttl"]).toThrow()
})
