module.exports = {
  // renovate: datasource=github-releases depName=helm/helm
  helm: "3.11.1",

  // renovate: datasource=github-tags depName=kubernetes/kubectl extractVersion=^kubernetes-(?<version>.+)$
  kubectl: "1.26.1",

  // renovate: datasource=github-releases depName=socialgouv/rollout-status
  rolloutStatus: "1.13.4",

  // renovate: datasource=github-releases depName=stern/stern
  stern: "1.25.0",

  // renovate: datasource=github-releases depName=carvel-dev/kapp
  kapp: "0.54.3",

  // renovate: datasource=github-releases depName=yannh/kubeconform
  kubeconform: "0.6.1",
}
