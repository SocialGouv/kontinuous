module.exports = async (values, options, { config, utils }) => {
  const { slug, deepmerge } = utils

  const { environment, gitBranch, projectName } = config

  // const branchSlug = slug(gitBranch)

  const env = environment

  const isProd = env === "prod"
  const isPreProd = env === "preprod"

  const {
    domain: defaultRootDomain,
    devDomain: defaultDevDomain,
    registry,
  } = options

  const imageProject = registry === "ghcr.io" ? "socialgouv" : projectName || ""

  const { repositoryName } = config

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const domain = isProd
    ? defaultRootDomain
    : defaultDevDomain || `dev.${defaultRootDomain}`

  const host = `${subdomain}.${domain}`

  const pgSecretName = "pg-user"

  const productionDatabase = repositoryName

  const { gitBranchSlug32: branchSlug32 } = config

  const pgDatabase = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `autodevops_${branchSlug32}`

  const pgUser = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `user_${branchSlug32}`

  const defaultValues = {
    global: {
      pgSecretName,
      pgDatabase,
      pgUser,
      host,
      domain,
      imageProject,
    },
  }

  values = deepmerge({}, defaultValues, values)

  return values
}
