/* eslint-disable no-undef */
require('jest-specific-snapshot');
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { readFile, mkdtemp } = require('fs/promises');
const dotenv = require('dotenv')
const builder = require('../action/build/builder')

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() || dirent.isSymbolicLink())
    .map(dirent => dirent.name)

const rootPath = path.resolve(`${__dirname}/..`)

const samplesDir = `${__dirname}/samples`
const testdirs = getDirectories(samplesDir)

const defaultEnv = {
  GIT_REF: "refs/heads/feature-branch-1",
  GIT_SHA: "ffac537e6cbbf934b08745a378932722df287a53",
  ENVIRONMENT: "dev",
  RANCHER_PROJECT_ID: "1234",
  RANCHER_PROJECT_NAME: "awesome",
}

const allEnvs = ["dev", "preprod", "prod"]
for (const testdir of testdirs){
  const specificEnv = testdir.split(".").pop()
  const environments = allEnvs.includes(specificEnv) ? [specificEnv] : allEnvs 
  const testdirPath = `${samplesDir}/${testdir}`
  const envFile = `${testdirPath}/.env`
  if (fs.pathExistsSync(envFile)) {
    const dotenvConfig = dotenv.parse(fs.readFileSync(envFile, { encoding: "utf-8" }))
    Object.assign(env, dotenvConfig)
  }
  for (const environment of environments){
    it(`build manifests for test "${testdir}" with env "${environment}"`, async () => {
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`));
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
      await builder(env)
      const output = await readFile(`${tmpDir}/manifests.yaml`, { encoding: "utf-8" })
      expect(output).toMatchSpecificSnapshot(`./__snapshots__/${testdir}.${environment}.yaml`);
    });
  }
}