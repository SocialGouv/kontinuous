/* eslint-disable no-undef */
require("jest-specific-snapshot")
const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const dotenv = require("dotenv")
const builder = require("../action/build/builder")

const getDirectoriesSync = require("../action/build/utils/getDirectoriesSync")

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
  const environments = allEnvs.includes(afterDot) ? [afterDot] : allEnvs
  for (const environment of environments) {
    cases.push([testdir, environment])
  }
}

test.each(cases)(`%s.%s`, async (testdir, environment) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`))
  const testdirPath = `${samplesDir}/${testdir}`
  const env = {
    ...process.env,
    ...defaultEnv,
    ENVIRONMENT: environment,
    KUBEWORKFLOW_PATH: rootPath,
    KWBUILD_PATH: tmpDir,
    WORKSPACE_PATH: testdirPath,
    WORKSPACE_SUBPATH: "",
    REPOSITORY: `test-${testdir}`,
  }
  const envFile = `${testdirPath}/.env`
  if (fs.pathExistsSync(envFile)) {
    const dotenvConfig = dotenv.parse(
      fs.readFileSync(envFile, { encoding: "utf-8" })
    )
    Object.assign(env, dotenvConfig)
  }
  const output = await builder(env)
  expect(output).toMatchSpecificSnapshot(
    `./__snapshots__/${testdir}.${environment}.yaml`
  )
})
