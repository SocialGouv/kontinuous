module.exports = async function createConfig() {
  const rancherProjectName = process.env.RANCHER_PROJECT_NAME
  const jobNamespace = `${rancherProjectName}-ci`

  const config = {
    project: {
      rancherProjectName,
      jobNamespace,
    },
  }

  return config
}
