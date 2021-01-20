/**
 * @param {Uint8Array} arr
 * @param {number} offset
 */
export const getUint16 = (arr, offset = 0) => {
  return new DataView(arr.buffer, arr.byteOffset + offset).getUint16(0, false);
};

/**
 * @param {Uint8Array} arr
 * @param {number} offset
 */
export const getUint8 = (arr, offset = 0) => {
  return new DataView(arr.buffer, arr.byteOffset + offset).getUint8(0, false);
};

/**
 *
 * @param {Uint8Array} arr
 * @param {number} offset
 */
export const getUint32 = (arr, offset = 0) => {
  return new DataView(arr.buffer, arr.byteOffset + offset).getUint32(0, false);
};

/**
 * @param {String} codec
 * @param {Uint8Array} arr
 */
export const decode = (codec, arr) => {
  return new TextDecoder(codec).decode(arr);
};
