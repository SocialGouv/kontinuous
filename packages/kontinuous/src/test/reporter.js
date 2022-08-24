const DiffError = require("./diff-error")

const logTests = (results) => {
  results.traverse({
    test(result) {
      if (!result.skipped) {
        console.log(
          `${"  ".repeat(result.nestLevel)}- ${result.name}: ${
            result.passed ? "PASSED" : "FAILED"
          } (in ${result.elapsed} ms)`
        )
      }
    },
    group(result) {
      if (!result.skipped) {
        console.log(
          `${"  ".repeat(result.nestLevel)} [ ${result.name} ] (${
            result.passedCount
          }/${result.totalCount})`
        )
      }
      return result.skipped
    },
  })
}

module.exports = (results) => {
  const testsOk = !results.errors.length
  if (testsOk) {
    console.log(`${results.name} passed.`)
    logTests(results)
  } else {
    console.log(`${results.name} tests failed!!`)
    if (results.definitionsOk) {
      logTests(results)
    }
    console.log(`${results.errors.length} Errors:`)
    results.errors.forEach((error, index) => {
      const i = index + 1
      if (error instanceof DiffError) {
        console.log(
          `${i}. Snapshot "${error.snapshotName}" doesn't match: \n${error.message}`
        )
      } else {
        console.log(`${i}. ${error.stack}`)
      }
    })
  }
}
