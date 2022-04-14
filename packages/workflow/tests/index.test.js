/* eslint-disable no-undef */
require("jest-specific-snapshot")
const path = require("path")
const fs = require("fs-extra")
const dotenv = require("dotenv")
const getDirectoriesSync = require("~common/utils/get-directories-sync")
const builder = require("~/build/builder")

const rootPath = path.resolve(`${__dirname}/..`)

const samplesDir = `${__dirname}/samples`
const testdirs = getDirectoriesSync(samplesDir)

const defaultEnv = {
  GIT_REF: "refs/heads/feature-branch-1",
  GIT_SHA: "ffac537e6cbbf934b08745a378932722df287a53",
  ENVIRONMENT: "dev",
  RANCHER_PROJECT_ID: "1234",
  RANCHER_PROJECT_NAME: "awesome",
}

const allEnvs = ["dev", "preprod", "prod"]
const cases = []
for (const testdir of testdirs) {
  const afterDot = testdir.split(".").pop()
  if (afterDot === "disabled") {
    continue
  }
  const subdirs = getDirectoriesSync(`${samplesDir}/${testdir}`)
  const environments = allEnvs.filter((envName) => subdirs.includes(envName))
  if (environments.length === 0) {
    environments.push(allEnvs[0])
  }
  for (const environment of environments) {
    cases.push([testdir, environment])
  }
}

test.each(cases)(`%s.%s`, async (testdir, environment) => {
  const testdirPath = `${samplesDir}/${testdir}`
  const env = {
    ...process.env,
    ...defaultEnv,
    ENVIRONMENT: environment,
    KUBEWORKFLOW_PATH: rootPath,
    WORKSPACE_PATH: testdirPath,
    WORKSPACE_SUBPATH: (await fs.pathExists(`${testdirPath}/.kube-workflow`))
      ? "/.kube-workflow"
      : "",
    GIT_REPOSITORY: `kube-workflow/test-${testdir}`,
    KW_NO_TREE:
      process.env.KW_NO_TREE !== "false" && process.env.KW_NO_TREE !== "0",
  }
  const envFile = `${testdirPath}/.env`
  if (fs.pathExistsSync(envFile)) {
    const dotenvConfig = dotenv.parse(
      fs.readFileSync(envFile, { encoding: "utf-8" })
    )
    Object.assign(env, dotenvConfig)
  }
  const { manifests } = await builder(env)
  expect(manifests).toMatchSpecificSnapshot(
    `./__snapshots__/${testdir}.${environment}.yaml`
  )
})
