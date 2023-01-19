const createEventsBucket = () => {
  const createIterator = () => {
    const stack = []
    let next
    async function* iterator() {
      while (true) {
        yield new Promise((res) => {
          if (stack.length > 0) {
            res(stack.shift())
            return
          }
          next = res
        })
      }
    }
    const iterate = iterator()
    iterate.push = (itm) => {
      if (next) {
        next(itm)
        next = false
        return
      }
      stack.push(itm)
    }

    return iterate
  }

  const createBucket = () => {
    const fullstack = []
    const iterators = []
    const register = async (callback) => {
      const iterator = createIterator()
      iterators.push(iterator)
      fullstack.forEach(iterator.push)
      for await (const param of iterator) {
        callback(param)
      }
    }
    const push = (param) => {
      fullstack.push(param)
      iterators.forEach((iterator) => iterator.push(param))
    }
    return { register, push }
  }

  const buckets = {}

  const emit = async (name, param) => {
    if (!buckets[name]) {
      buckets[name] = createBucket()
    }
    buckets[name].push(param)
  }

  const on = async (name, callback) => {
    if (!buckets[name]) {
      buckets[name] = createBucket()
    }
    buckets[name].register(callback)
  }

  return { on, emit }
}

module.exports = createEventsBucket

/*
;(async function () {
  const evts = createEventsBucket()

  evts.emit("num", "1")
  evts.emit("num", "2")
  evts.emit("num", "3")
  evts.emit("let", "A")
  evts.emit("let", "B")
  evts.emit("num", "4")
  evts.emit("let", "C")
  evts.emit("let", "D")

  evts.on("num", (n) => console.log(n))
  evts.on("num", (n) => console.log(`num2:${n}`))
  evts.on("let", (n) => console.log(n))

  setInterval(() => {
    evts.emit("num", Date.now())
    evts.emit("let", `${Date.now()}AAAAAAA`)
  }, 1000)
})()
*/
