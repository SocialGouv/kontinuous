// see https://stackoverflow.com/a/29497680/5338073

const re =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
module.exports = (msg) => msg.replace(re, "")
