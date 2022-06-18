module.exports = (src)=>{
  if(src.includes("node_modules/")){
    return false
  }
  return true
}