const kindsRunnable = ["Deployment", "StatefulSet", "DaemonSet", "Job"]

module.exports = (kind) => kindsRunnable.includes(kind)
