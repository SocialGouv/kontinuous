const { execSync } = require('child_process');

const shell = (cmd) => execSync(cmd, { encoding: 'utf8' })

module.exports = shell