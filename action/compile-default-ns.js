const fs = require('fs-extra');

const yaml = require('js-yaml');

const main = async() => {
  const values = JSON.parse(fs.readFileSync("compiled.values.json"))
  const defaultNamespace = values.global.namespace
  const iterator = yaml.loadAll(fs.readFileSync("manifests.base.yaml"))
  const manifests = []
  for (const manifest of iterator){
    if (!manifest){
      continue
    }
    if(!manifest.metadata){
      manifest.metadata = {}
    }
    if(!manifest.metadata.namespace){
      manifest.metadata.namespace = defaultNamespace
    }
    manifests.push(yaml.dump(manifest))
  }
  fs.writeFileSync("manifests.base.yaml", manifests.join("---\n"))
}

main()
