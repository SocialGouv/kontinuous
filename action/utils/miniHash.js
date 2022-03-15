const miniHash = function jenkinsOneAtATimeHash(keyString) {
  let hash = 0;
  for (charIndex = 0; charIndex < keyString.length; ++charIndex) {
    hash += keyString.charCodeAt(charIndex);
    hash += hash << 10;
    hash ^= hash >> 6;
  }
  hash += hash << 3;
  hash ^= hash >> 11;
  return (((hash + (hash << 15)) & 4294967295) >>> 0).toString(16)
}

module.exports = miniHash