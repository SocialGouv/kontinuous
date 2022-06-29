const path = require("path")
const fs = require("fs")

// see https://github.com/import-js/eslint-plugin-import/issues/1174
const packageDirs = ["packages"]
const packageDir = []
for (const dir of packageDirs) {
  for (const d of fs
    .readdirSync(path.resolve(__dirname, dir))
    .filter(
      (entry) =>
        entry.slice(0, 1) !== "." &&
        fs.lstatSync(path.resolve(__dirname, dir, entry)).isDirectory()
    )) {
    const fullpath = path.resolve(__dirname, dir, d)
    if (fs.existsSync(`${fullpath}/package.json`)) {
      packageDir.push(fullpath)
    }
  }
}
const noExtraneousRule = [
  "error",
  {
    devDependencies: true,
    optionalDependencies: false,
    peerDependencies: false,
    packageDir,
  },
]

module.exports = {
  ignorePatterns: ["packages/webhook/build/*"],
  settings: {
    "import/resolver": {
      alias: true,
    },
  },
  extends: ["airbnb-base", "prettier", "plugin:jest/recommended"],
  plugins: ["prettier", "import", "jest"],
  rules: {
    "node/no-extraneous-require": [0],
    "import/no-commonjs": [0],
    "import/no-dynamic-require": [0],
    "import/no-extraneous-dependencies": noExtraneousRule,
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "index",
          "sibling",
          "object",
        ],
        pathGroups: [
          {
            group: "internal",
            pattern: "~/**",
          },
          {
            group: "internal",
            pattern: "~**",
          },
        ],
        pathGroupsExcludedImportTypes: [],
      },
    ],
    "global-require": [0],
    "no-restricted-syntax": [0],
    "no-async-promise-executor": [0],
    "no-nested-ternary": [0],
    "no-loop-func": [0],
    "no-new": [0],
    "func-names": [0],
    "no-plusplus": [0],
    "no-param-reassign": [0],
    "no-continue": [0],
    "no-unused-vars": [
      2,
      {
        vars: "all",
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "no-console": [0],
    "no-throw-literal": [0],
    "no-await-in-loop": [0],
    "consistent-return": [0],
    "no-underscore-dangle": [0],
    "no-template-curly-in-string": [0],
    semi: ["error", "never"],
    "prettier/prettier": [
      "error",
      {
        semi: false,
        // printWidth: 80,
        // tabWidth: 2,
        // useTabs: false,
        // singleQuote: false,
        // bracketSpacing: true,
      },
    ],
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
    env: [
      {
        node: true,
      },
    ],
  },
}
