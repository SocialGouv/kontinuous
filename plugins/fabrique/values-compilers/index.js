module.exports = [
  "./socialgouv-autodevops.js",

  "../charts/contrib/values-compilers/01-unfold-charts",
  "../charts/contrib/values-compilers/03-resolve-alias-of",
  "../charts/contrib/values-compilers/04-implicit-enabled",
  "../charts/contrib/values-compilers/05-jobs",
  "../charts/contrib/values-compilers/06-global-defaults",

  "./global-defaults.js",

  "../charts/contrib/values-compilers/09-maildev.js",
  "../charts/contrib/values-compilers/10-tpl-meta-values",

  "./buildkit-service-pod-count-injector.js",
]
