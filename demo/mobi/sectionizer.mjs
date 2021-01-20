import { getUint16, getUint32 } from "./utils.mjs";

export class Sectionizer {
  /**
   * @param {Uint8Array} data
   */
  constructor(data) {
    this.data = data;

    this.palmname = data.subarray(0, 32);
    this.palmheader = data.subarray(0, 78);
    this.ident = this.palmheader.subarray(0x3c, 0x3c + 8);
    this.num_sections = getUint16(this.palmheader, 76);

    console.log(
      `Palm DB type: ${new TextDecoder("utf-8").decode(this.ident)}, ${
        this.num_sections
      } sections.`
    );

    this.sectionsdata = [];
    for (let i = 0; i < this.num_sections * 2; i += 1) {
      this.sectionsdata.push(getUint32(this.data.subarray(78), i * 8));
    }
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
