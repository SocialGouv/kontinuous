module.exports = ({scope=["project"], inc, type})=>{

  const newScope = [...scope]

  const fragments = inc.split("/")
  let parentIncr = 0
  while(fragments.length>0){
    const fragment = fragments.shift()
    if(fragment===".."){
      if(parentIncr>0){
        newScope.pop()
      }
      parentIncr++
    } else if (fragment==="charts"&&parentIncr>0){
      newScope.push(...fragments)
      break
    }
  }

  if(newScope.length>0&&newScope[newScope.length-1]===type){
    newScope.pop()
  }

  return newScope
}