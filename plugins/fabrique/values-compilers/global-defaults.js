const MAX_DNS_LENGTH = 63

module.exports = async (values, options, { config, utils }) => {
  const { slug, deepmerge } = utils

  const { environment, gitBranch } = config

  const branchSlug = slug(gitBranch)

  const env = environment

  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const { repositoryName } = config

  const { domain: defaultRootDomain } = options

  const globalHostMaxLength =
    MAX_DNS_LENGTH - Math.max(...Object.keys(values).map((key) => key.length))

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`, { maxLength: globalHostMaxLength })

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const domain = isProd ? defaultRootDomain : `dev.${defaultRootDomain}`

  const host = `${subdomain}.${domain}`

  const pgSecretName = isProd
    ? "pg-user"
    : isPreProd
    ? "pg-user"
    : `pg-user-${branchSlug}`

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
    },
  }

  values = deepmerge({}, defaultValues, values)

  return values
}
