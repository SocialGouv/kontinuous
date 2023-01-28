module.exports = {
  // renovate: datasource=github-releases depName=helm/helm
  helm: "v3.11.0",

  // renovate: datasource=github-tags depName=kubectl lookupName=kubernetes/kubectl extractVersion=^kubernetes-(?<version>.+)$
  kubectl: "v1.26.1",

  // renovate: datasource=github-releases depName=socialgouv/rollout-status
  rolloutStatus: "v1.13.4",

  // renovate: datasource=github-releases depName=stern/stern extractVersion=^v(?<version>.+)$
  stern: "1.22.0",

  // renovate: datasource=github-releases depName=carvel-dev/kapp
  kapp: "v0.52.0",
}
