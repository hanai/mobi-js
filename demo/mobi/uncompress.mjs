import { decode } from './utils.mjs';

export class PalmdocReader {
  unpack(i) {
    let o = '';
    let p = 0;

    while (p < i.length) {
      let c = i[p];
      p += 1;
      if (c >= 1 && c <= 8) {
        o += decode(i.slice(p, p + c));
        p += c;
      } else if (c < 128) {
        o += decode([c]);
      } else if (c >= 192) {
        o += ' ' + decode(c ^ 128);
      } else {
        if (p < i.length) {
        }
      }
    }
    console.log(o);
    return o;
  }
}
