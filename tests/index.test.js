/* eslint-disable no-undef */
const os = require('os')
const path = require('path')
const { readdirSync } = require('fs')
const { access, readFile, mkdtemp } = require('fs/promises');
const dotenv = require('dotenv')
const asyncShell = require('./utils/asyncShell')

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const rootPath = path.resolve(`${__dirname}/..`)

const samplesDir = `${__dirname}/samples`
const testdirs = getDirectories(samplesDir)

for (const testdir of testdirs){
  it(`build manifests correctly for "${testdir}"`, async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`));
    const testdirPath = `${samplesDir}/${testdir}`
    const envFile = `${testdirPath}/.env`
    let envFileExists
    try {
      await access(envFile)
      envFileExists = true
    }catch(_e){
      envFileExists = false
    }
    const env = envFileExists ?
      dotenv.parse(await readFile(envFile, {encoding: "utf-8"}))
      : process.env
    Object.assign(env, {
      KUBEWORKFLOW_PATH: rootPath,
      AUTODEVOPS_PATH: tmpDir,
      WORKSPACE_PATH: testdirPath,
    })
    await asyncShell([`${rootPath}/dev-local.sh`], {
      env,
    }, true)
    const output = await readFile(`${tmpDir}/manifests.yaml`, { encoding: "utf-8" })
    expect(output).toMatchSnapshot();
  });
}