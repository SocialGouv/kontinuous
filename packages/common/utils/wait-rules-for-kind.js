const Cluster = (item) => item.spec.instances === item.status?.readyInstances
module.exports = { Cluster }
