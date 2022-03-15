const { execFile } = require('child_process');

const promiseFromChildProcess = (child) => {
  return new Promise(function (resolve, reject) {
    child.addListener("error", reject);
    child.addListener("exit", resolve);
  });
}

const asyncShell = ([cmd, ...args], pipe = false) => {
  const childProcess = execFile(cmd, args, { encoding: 'utf8' })
  if (pipe) {
    childProcess.stdout.pipe(process.stdout)
    childProcess.stderr.pipe(process.stderr)
  }
  return promiseFromChildProcess(childProcess)
}

module.exports = asyncShell