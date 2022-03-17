/* eslint-disable no-undef */
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { readFile, mkdtemp } = require('fs/promises');
const dotenv = require('dotenv')
const builder = require('../action/build/builder')

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
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

for (const testdir of testdirs){
  for (const environment of ["dev","preprod","prod"]){
    it(`build manifests for test "${testdir}" with env "${environment}"`, async () => {
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`));
      const testdirPath = `${samplesDir}/${testdir}`
      const env = {
        ...process.env,
        ...defaultEnv,
        ENVIRONMENT: environment,
        KUBEWORKFLOW_PATH: rootPath,
        KWBUILD_PATH: tmpDir,
        WORKSPACE_PATH: testdirPath,
        // REPOSITORY: `test-${path.basename(testdir)}`,
        REPOSITORY: `${path.basename(testdir)}`,
      }
      const envFile = `${testdirPath}/.env`
      if(fs.pathExistsSync(envFile)){
        const dotenvConfig = dotenv.parse(await fs.readFile(envFile, { encoding: "utf-8" }))
        Object.assign(env, dotenvConfig)
      }
      await builder(env)
      const output = await readFile(`${tmpDir}/manifests.yaml`, { encoding: "utf-8" })
      expect(output).toMatchSnapshot();
    });
  }
}