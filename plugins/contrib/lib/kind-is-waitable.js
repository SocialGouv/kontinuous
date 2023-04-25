const rolloutStatusHandledKinds = ["Deployment", "StatefulSet", "Job"]

module.exports = (kind, customWaitableKinds = []) =>
  rolloutStatusHandledKinds.includes(kind) || customWaitableKinds.includes(kind)
