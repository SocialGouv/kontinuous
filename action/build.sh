#!/usr/bin/env bash
set -e

set -x

[ -d node_modules ] || yarn install --production

set -a
$(dirname $0)/env.sh
set +a

$(dirname $0)/utils/need-vars.sh "AUTODEVOPS_PATH KUBEWORKFLOW_PATH ENVIRONMENT"

rm -rf $AUTODEVOPS_PATH

mkdir -p $AUTODEVOPS_PATH

cd $AUTODEVOPS_PATH


echo "Prepare charts and overlays"
cp -r "$KUBEWORKFLOW_PATH/chart/." .

if [ -d "$WORKSPACE_PATH/.kube-workflow" ]; then
  cp -r "$WORKSPACE_PATH/.kube-workflow/." .
fi

echo "Generate values file"
node $KUBEWORKFLOW_PATH/action/values.js > values.env.yaml

VALUES_FILES=""
if [ -f "common/values.yaml" ]; then
  VALUES_FILES+=" common/values.yaml"
fi
VALUES_FILES+=" values.env.yaml"
if [ -f "env/${ENVIRONMENT}/values.yaml" ]; then
  VALUES_FILES+=" env/${ENVIRONMENT}/values.yaml"
fi

echo "Merging values files"
cp values.yaml merged.values.yaml
for valuefile in $VALUES_FILES; do
  echo "$(yq eval-all -o yaml 'select(fileIndex == 0) * select(fileIndex == 1)' merged.values.yaml $valuefile)" \
    >merged.values.yaml
done

echo "Compiling composite uses"
node $KUBEWORKFLOW_PATH/action/compile-uses.js

echo "Compiling additional subcharts instances"
node $KUBEWORKFLOW_PATH/action/compile-chart.js

echo "Merge .kube-workflow env manifests"
NAMESPACE=$(cat compiled.values.json | yq e '.global.namespace')
shopt -s globstar
for filename in $WORKSPACE_PATH/.kube-workflow/env/$ENVIRONMENT/templates/**/*.{yml,yaml}; do
  [ -f "$filename" ] || continue
  echo "Merging $filename to manifests templates"
  target="templates/$(basename $filename)"
  cp "$filename" "$target"
  yq -i e '.metadata.namespace |= "'$NAMESPACE'"' "$target"
done

echo "Build base manifest using helm"
HELM_TEMPLATE_ARGS=""
if [ -n "$COMPONENTS" ]; then
  # first disable all existing components
  while IFS= read -r value; do
    component="$(echo $value | sed 's/- //g')"
    HELM_TEMPLATE_ARGS+=" --set $component.enabled=false"
  done < <(yq '.dependencies.[].name' Chart.yaml)
  
  # then enable that was specified by `components` input
  for component in "$COMPONENTS"; do
    HELM_TEMPLATE_ARGS+=" --set $component.enabled=true"
  done
fi

helm template \
  -f compiled.values.json \
  $HELM_TEMPLATE_ARGS \
  . \
  > manifests.base.yaml

echo "Build final manifests using kustomize"
kustomize build \
  --load-restrictor=LoadRestrictionsNone \
  "env/$ENVIRONMENT" \
  > manifests.yaml

echo "Build manifests: $PWD/manifests.yaml"