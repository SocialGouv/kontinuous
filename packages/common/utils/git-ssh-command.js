module.exports = ({ deployKey } = {}) =>
  `ssh ${
    deployKey ? `-i ${deployKey} ` : ""
  }-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no`
