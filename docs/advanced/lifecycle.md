# 🌀 Life Cycle

## 📝 build manifests

- load dependencies (from .kontinuous/config.yaml) ♾️ Git based extensible plugins ecosystem
- values-compilers (and values.final.js) plugins 🐒 Expose easy to use options you choose for your final developers
- helm template 🌟 Full access to rich helm ecosystem and fractal service definitions (subcharts)
- patches (and post-renderer) plugins 🎯 Highly Customizable (better than kustomize)
- validators plugins ✅ Verify compliance (opinionable)
- debug-manifests plugins 🐞 Tailor makable debugging

see [kontinuous build details](./advanced/build.md)

## 🚀 deploy manifests

- pre-deploy plugins
- deploy
  - deploy-with plugins
  - deploy-sidecars plugins
- post-deploy plugins

see [kontinuous deploy details](./advanced/deploy.md)
