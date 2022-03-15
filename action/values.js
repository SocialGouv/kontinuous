const { generate } = require("@socialgouv/env-slug")

const {
  REPOSITORY,
  ENVIRONMENT,
  RANCHER_PROJECT_ID,
  RANCHER_PROJECT_NAME,
  IMAGE_REGISTRY,
  IMAGE_NAME,
  GIT_REF,
  GIT_SHA,
  KEEP_ALIVE,
  CERT_SECRET_NAME,
  PRODUCTION_DATABASE,
  GIT_HEAD_REF,
  COMPONENTS,
} = process.env;

const gitBranch = GIT_HEAD_REF ? GIT_HEAD_REF : GIT_REF
const branchName = gitBranch.replace("refs/heads/", "").replace("refs/tags/","");

const branchSlug = generate(branchName);

const env = ENVIRONMENT || "dev"
const isProduction = env === "prod";
const isPreProduction = env === "preprod";
const isDev = !(isProduction || isPreProduction);

const repository = REPOSITORY
const repositoryName = repository.split("/").pop();

const subdomain = isProduction ? repositoryName : isPreProduction ? `${repositoryName }-preprod`
  : generate(`${repositoryName}-${branchName}`)

const namespace = isProduction ? repositoryName : isPreProduction ? `${repositoryName}-preprod`
  : generate(`${repositoryName}-${branchName}`)

const keepAlive = Boolean(KEEP_ALIVE);

const isRenovate = branchName.startsWith("renovate");
const isDestroyable = isDev && !keepAlive;

const ttl = isDestroyable ? (isRenovate ? "1d" : "7d") : "";

const sha = GIT_SHA || "";
const imageTag = isPreProduction
  ? `preprod-${sha}`
  : gitBranch.startsWith("refs/tags/")
  ? (gitBranch.split("/").pop() || "").substring(1)
  : `sha-${sha}`;

const MAX_HOSTNAME_SIZE = 53;
const shortenHost = (hostname) =>
  hostname.slice(0, MAX_HOSTNAME_SIZE).replace(/-+$/, "");

const rootSocialGouvDomain = "fabrique.social.gouv.fr"

const domain = isProduction ? rootSocialGouvDomain : `dev.${rootSocialGouvDomain}`;

const host = `${shortenHost(subdomain)}.${domain}`;

const registry = IMAGE_REGISTRY || "ghcr.io/socialgouv";
const imageName = IMAGE_NAME || repositoryName;
const image = `${registry}/${imageName}`;

const rancherProjectId = RANCHER_PROJECT_ID;

const certSecretName =
  CERT_SECRET_NAME || (isProduction ? `${repositoryName}-crt` : "wildcard-crt");

const pgSecretName = isProduction ? "pg-user" :
  isPreProduction ? "pg-user-preprod"
  : `pg-user-${branchSlug}`

const productionDatabase = PRODUCTION_DATABASE || repositoryName

const pgDatabase = isProduction ? productionDatabase :
  isPreProduction ? "preprod"
    : `autodevops_${branchSlug}`
    
const pgUser = isProduction ? productionDatabase :
  isPreProduction ? "preprod"
    : `user_${branchSlug}`

const jobNamespace = (RANCHER_PROJECT_NAME || repositoryName)+"-ci"

const values = {
  global: {
    repository,
    repositoryName,
    isProduction,
    isPreProduction,
    ttl,
    namespace,
    gitBranch,
    rancherProjectId,
    certSecretName,
    pgSecretName,
    pgDatabase,
    pgUser,
    host,
    domain,
    image,
    imageTag,
    branchSlug,
    branchName,
    jobNamespace,
    sha,
    env,
  },
};

const dump = JSON.stringify(values, null, 2);

console.log(dump);
