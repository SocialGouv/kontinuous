const gitSshCommand = require("./git-ssh-command")

module.exports = ({ env = process.env, deployKey } = {}) => {
  const procEnv = { ...env }
  if (deployKey) {
    procEnv.GIT_SSH_COMMAND = gitSshCommand({ deployKey })
  }
  return procEnv
}
