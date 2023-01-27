module.exports = async (values, options, { config, utils }) => {
  const { slug, deepmerge } = utils

  const { environment, gitBranch, projectName } = config

  // const branchSlug = slug(gitBranch)

  const env = environment

  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const { domain: defaultRootDomain, registry } = options

  const imageProject = registry === "ghcr.io" ? "socialgouv" : projectName || ""

  const { repositoryName } = config

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const domain = isProd ? defaultRootDomain : `dev.${defaultRootDomain}`

  const host = `${subdomain}.${domain}`

  const pgSecretName = "pg-user"

  const productionDatabase = repositoryName

  const branchSlug32 = slug(gitBranch, 32)

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
      ttl,
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
