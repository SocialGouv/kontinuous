### 🐉 The paradigm
***Why another CI/CD ?***

Most of tools that already exists are only featured to CI or CD, not both in a unified way, or when it's the case, the approach is strongly opinionated making it incompatible with many complexes use cases. Existings tools are also lacking of extensibility, with inexistant or very restrictive plugin system.<br>
Kontinuous addresses all theses needs and, by using it's rich ***out-of-the-box*** plugins, it can addresses many more.

***The approach***

In a simple sentence: Kubernetes manifests as pipelines. <br>
What does that means ? <br>
All CI+CD pipelines are reproductible applying the built yaml manifests.

***Philosophy***

Keep as close as possible of battle tested and confident tech paradigms as native kubernetes and helm so we can use all theirs powers and abilities with features enrichment. <br>
CLI runnable from anywhere: CI runner (github, gitlab, ...), kubernetes job (creatable from webhook, itself trigerrable from git platform webhook feature, from another ci/cd pipeline or manually), even your own laptop.<br>
Everything are plugins. Especially opinions. So we keep modularity and we can switch between approach and tooling when needed. <br>

***Main goals***

- GitOPS to Kubernetes 🚀
- Kubernetes to PaaS Framework 🐉 
- CI/CD as K8S Manifest 🐋
- Powerfull Plugins Ecosystem ♾️
- 100% OpenSource - No vendor lock-in 🔓

🚀 Project repository as source of truth from review environments to production deployment. <br>
🐉 Simplicity for final dev users is crucial, so we must be able to express opinion abstractions as plugins to reflect the most our cases and currents usages without falling in the trap of implementing them into the core of the framework, that must stay universal and able to handle any new and unknowns cases in future. <br>
♾️ DevOPS problems are complexes and cases are plethora. We must be able to split big problematics into smaller, to adress each one separately. <br>
🐋 Deployment must be reproductible relying only on kubernetes, so the pipelines that produce deployments possible, must be abstracted as kubernetes manifests. <br>
🔓 We don't want to be held hostage by proprietary code and let multinationals rule the game for us. The full chain from repositories to deployment must be self-hostable. <br>

***Main stack***

[Helm](https://helm.sh/):
    build manifests from helm templates, so kontinuous is interoperable the most popular package manager for kubernetes and can use the go templating language that is widely adopted in the kubernetes ecosystem <br>
[NodeJS](https://nodejs.org):
    expose adapted and simplified logic to final dev users, with ready to use values system corresponding to infra, flexible patching system, easy to use plugin charts system etc...