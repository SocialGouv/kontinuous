module.exports = {
  common: {
    paths: ["./"],
    recursive: true,
    silent: false,
    exclude: "*.md,node_modules",
  },
  replacers: [
    {
      regex: "socialgouv/kontinuous(\\S*)(:|@)([a-zA-Z0-9-.]+)",
      replacementFactory: (version) => `socialgouv/kontinuous$1$2${version}`,
    },
  ],
}
