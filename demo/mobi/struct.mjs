import { getUint16, getUint32, getUint8 } from './utils.mjs'

const type_size_map = {
  b: 1,
  B: 1,
  H: 2,
  I: 4,
  L: 4,
  Q: 8,
}

const type_getter_map = {
  B: getUint8,
  H: getUint16,
  L: getUint32,
}

/**
 * @param {String} fmt
 * @param {Uint8Array} buffer
 * @param {number} offset
 */
export const unpack = (fmt, buffer, offset = 0) => {
  const res = []
  fmt = fmt.replace(/(\d+)(.)/g, function ($$, $1, $2) {
    return $2.repeat(parseInt($1))
  })
  fmt.split('').forEach((char) => {
    if (char === '>') {
      return
    } else {
      const size = type_size_map[char]
      let val
      const getter = type_getter_map[char]
      if (getter) {
        val = getter(buffer, offset)
      } else if (size === 2) {
        val = getUint16(buffer, offset)
      } else if (size === 4) {
        val = getUint32(buffer, offset)
      }
      offset += size
      res.push(val)
    }
  })
  return res
}
