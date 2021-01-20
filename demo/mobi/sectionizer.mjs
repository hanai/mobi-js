import { getUint16, getUint32, decode } from './utils.mjs';
import * as struct from './struct.mjs';

export class Sectionizer {
  /**
   * @param {Uint8Array} data
   */
  constructor(data) {
    this.data = data;
    this.palmheader = data.subarray(0, 78);
    this.palmname = data.subarray(0, 32);
    this.ident = this.palmheader.subarray(0x3c, 0x3c + 8);
    this.num_sections = struct.unpack('>H', this.palmheader, 76)[0];

    console.log(
      `Palm DB type: ${decode(this.ident)}, ${this.num_sections} sections.`
    );

    this.sectionsdata = struct.unpack(
      `>${this.num_sections * 2}L`,
      this.data,
      78
    );
    this.sectionoffsets = [];
    this.sectionattributes = [];
    this.sectionsdata.forEach((e, i) => {
      if (i % 2 === 0) {
        this.sectionoffsets.push(e);
      } else {
        this.sectionattributes.push(e);
      }
    });
  }

  /**
   * @param {int} section
   */
  loadSection(section) {
    const [before, after] = this.sectionoffsets.slice(section, section + 2);
    return this.data.subarray(before, after);
  }
}
