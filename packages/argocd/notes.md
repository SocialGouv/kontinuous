# Old RoadMap to ArgoCD integration

Kubernetes manifests tuto here: https://itnext.io/configure-custom-tooling-in-argo-cd-a4948d95626e

Build your own image: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom_tools/#byoi-build-your-own-image

run preDeploy on argocd at buid step (to init rancher namespace and other eventually needed preDeploy plugins):

```sh
kontinuous build -o > manifests.yaml 
kontinuous deploy -f manifests.yaml \
  --disable-step=validators \
  --disable-step=deploy \
  --disable-step=post-deploy
```