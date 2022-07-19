/* eslint-disable no-undef */
require("jest-specific-snapshot")

const path = require("path")
const os = require("os")

const fs = require("fs-extra")
const dotenv = require("dotenv")

const loggerFactory = require("~common/utils/logger-factory")
const slug = require("~common/utils/slug")

jest.doMock("~common/utils/logger", () => loggerFactory({ sync: true }))

const getDirectoriesSync = require("~common/utils/get-directories-sync")

const ctx = require("~common/ctx")

const cli = require("~/cli")

const samplesDir = `${__dirname}/samples`
const testdirs = getDirectoriesSync(samplesDir)

const defaultEnv = {
  KS_KONTINUOUS_PATH: path.resolve(`${__dirname}/..`),
  KS_GIT_REF: "refs/heads/feature-branch-1",
  KS_GIT_SHA: "ffac537e6cbbf934b08745a378932722df287a53",
  KS_ENVIRONMENT: "dev",
  KS_CI_NAMESPACE: "awesome-ci",
  RANCHER_PROJECT_ID: "1234",
}

const allEnvs = ["dev", "preprod", "prod"]
const cases = []
for (const testdir of testdirs) {
  const afterDot = testdir.split(".").pop()
  if (afterDot === "disabled") {
    continue
  }
  const envDir = `${samplesDir}/${testdir}/env`
  let environments = []
  if (fs.pathExistsSync(envDir)) {
    const subdirs = getDirectoriesSync(envDir)
    environments = allEnvs.filter((envName) => subdirs.includes(envName))
  }
  if (environments.length === 0) {
    environments.push(allEnvs[0])
  }
  for (const environment of environments) {
    cases.push([testdir, environment])
  }
}

const createSampleSnapTest = (testdir, environment) => async () => {
  const testdirPath = `${samplesDir}/${testdir}`
  const tmpdir = os.tmpdir()
  const buildPath = path.join(tmpdir, "kontinuous", "tests", slug(testdir))
  await fs.emptyDir(buildPath)
  const env = {
    ...process.env,
    ...defaultEnv,
    KS_ENVIRONMENT: environment,
    KS_WORKSPACE_PATH: testdirPath,
    KS_WORKSPACE_SUBPATH: (await fs.pathExists(`${testdirPath}/.kontinuous`))
      ? "/.kontinuous"
      : "",
    KS_GIT: "false",
    KS_GIT_REPOSITORY: `kontinuous/test-${testdir}`,
    KS_INLINE_CONFIG_SET: `links.SocialGouv/kontinuous: "${path.resolve(
      `${__dirname}/../../..`
    )}"`,
    KS_HOMEDIR: `${tmpdir}/kontinuous/test-homedir`,
    KS_BUILD_PATH: buildPath,
  }
  const envFile = `${testdirPath}/.env`
  if (fs.pathExistsSync(envFile)) {
    const dotenvConfig = dotenv.parse(
      await fs.readFile(envFile, { encoding: "utf-8" })
    )
    Object.assign(env, dotenvConfig)
  }
  ctx.provide()
  ctx.set("env", env)
  await cli([...process.argv.slice(0, 2), "build"])
  const result = ctx.require("result")
  const { manifests } = result
  expect(manifests).toMatchSpecificSnapshot(
    `./__snapshots__/${testdir}.${environment}.yaml`
  )
}

for (const [testdir, environment] of cases) {
  // eslint-disable-next-line jest/expect-expect
  test(`${testdir}.${environment}`, createSampleSnapTest(testdir, environment))
}
