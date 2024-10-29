const order = [
  "namespace",
  "networkpolicy",
  "serviceaccount",
  "role",
  "rolebinding",
  "configmap",
  "secret",
  "sealedsecret",
  "persistentvolume",
  "persistentvolumeclaim",
  "cronjob",
  "job",
  "deployment",
  "statefullset",
  "daemonset",
  "service",
]
module.exports = async (manifests, _options, _context) =>
  manifests.sort((a, b) => {
    const indexA = order.indexOf(a.kind.toLowerCase())
    const indexB = order.indexOf(b.kind.toLowerCase())
    if (indexA === -1 || indexB === -1) {
      return 0
    }
    return indexA - indexB
  })
