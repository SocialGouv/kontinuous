module.exports = (values) =>
  Object.assign(values, {
    global: {
      ...values.global,
      imageProject: null,
      host: "test.demo.net",
      namespace: "test-namespace",
    },
    app: {
      enabled: true,
      containerPort: 80,
      registry: "docker.io",
      imageRepository: "library",
      imagePackage: "nginx",
      imageTag: "latest",
    },
  })
