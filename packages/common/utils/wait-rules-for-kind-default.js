module.exports = (item) => {
  const status = item.status?.conditions?.reduce((o, condition) => {
    o[condition.type] = condition.status
    return o
  }, {})
  return status?.Ready?.toLowerCase() === "true"
}
