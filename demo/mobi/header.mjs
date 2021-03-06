import { Sectionizer } from './sectionizer.mjs';
import { PalmdocReader } from './uncompress.mjs';
import { getUint16, getUint32, decode, getLanguage } from './utils.mjs';
import * as struct from './struct.mjs';

export class MobiHeader {
  static id_map_strings = {
    1: 'Drm Server Id',
    2: 'Drm Commerce Id',
    3: 'Drm Ebookbase Book Id',
    4: 'Drm Ebookbase Dep Id',
    100: 'Creator',
    101: 'Publisher',
    102: 'Imprint',
    103: 'Description',
    104: 'ISBN',
    105: 'Subject',
    106: 'Published',
    107: 'Review',
    108: 'Contributor',
    109: 'Rights',
    110: 'SubjectCode',
    111: 'Type',
    112: 'Source',
    113: 'ASIN',
    114: 'versionNumber',
    117: 'Adult',
    118: 'Retail-Price',
    119: 'Retail-Currency',
    120: 'TSC',
    122: 'fixed-layout',
    123: 'book-type',
    124: 'orientation-lock',
    126: 'original-resolution',
    127: 'zero-gutter',
    128: 'zero-margin',
    129: 'MetadataResourceURI',
    132: 'RegionMagnification',
    150: 'LendingEnabled',
    200: 'DictShortName',
    501: 'cdeType',
    502: 'last_update_time',
    503: 'Updated_Title',
    504: 'CDEContentKey',
    505: 'AmazonContentReference',
    506: 'Title-Language',
    507: 'Title-Display-Direction',
    508: 'Title-Pronunciation',
    509: 'Title-Collation',
    510: 'Secondary-Title',
    511: 'Secondary-Title-Language',
    512: 'Secondary-Title-Direction',
    513: 'Secondary-Title-Pronunciation',
    514: 'Secondary-Title-Collation',
    515: 'Author-Language',
    516: 'Author-Display-Direction',
    517: 'Author-Pronunciation',
    518: 'Author-Collation',
    519: 'Author-Type',
    520: 'Publisher-Language',
    521: 'Publisher-Display-Direction',
    522: 'Publisher-Pronunciation',
    523: 'Publisher-Collation',
    524: 'Content-Language-Tag',
    525: 'primary-writing-mode',
    526: 'NCX-Ingested-By-Software',
    527: 'page-progression-direction',
    528: 'override-kindle-fonts',
    529: 'Compression-Upgraded',
    530: 'Soft-Hyphens-In-Content',
    531: 'Dictionary_In_Langague',
    532: 'Dictionary_Out_Language',
    533: 'Font_Converted',
    534: 'Amazon_Creator_Info',
    535: 'Creator-Build-Tag',
    536: 'HD-Media-Containers-Info', // CONT_Header is 0, Ends with CONTAINER_BOUNDARY (or Asset_Type?)
    538: 'Resource-Container-Fidelity',
    539: 'HD-Container-Mimetype',
    540: 'Sample-For_Special-Purpose',
    541: 'Kindletool-Operation-Information',
    542: 'Container_Id',
    543: 'Asset-Type', // FONT_CONTAINER, BW_CONTAINER, HD_CONTAINER
    544: 'Unknown_544',
  };

  static id_map_values = {
    115: 'sample',
    116: 'StartOffset',
    121: 'Mobi8-Boundary-Section',
    125: 'Embedded-Record-Count',
    130: 'Offline-Sample',
    131: 'Metadata-Record-Offset',
    201: 'CoverOffset',
    202: 'ThumbOffset',
    203: 'HasFakeCover',
    204: 'Creator-Software',
    205: 'Creator-Major-Version',
    206: 'Creator-Minor-Version',
    207: 'Creator-Build-Number',
    401: 'Clipping-Limit',
    402: 'Publisher-Limit',
    404: 'Text-to-Speech-Disabled',
    406: 'Rental-Expiration-Time',
  };

  static id_map_hexstrings = {
    208: 'Watermark_(hex)',
    209: 'Tamper-Proof-Keys_(hex)',
    300: 'Font-Signature_(hex)',
    403: 'Unknown_(403)_(hex)',
    405: 'Ownership-Type_(hex)',
    407: 'Unknown_(407)_(hex)',
    420: 'Multimedia-Content-Reference_(hex)',
    450: 'Locations_Match_(hex)',
    451: 'Full-Story-Length_(hex)',
    452: 'Sample-Start_Location_(hex)',
    453: 'Sample-End-Location_(hex)',
  };

  /**
   * @param {Sectionizer} sect
   * @param {number} sectNumber
   */
  constructor(sect, sectNumber) {
    /**
     * @type {Sectionizer}
     * @public
     */
    this.sect = sect;
    this.start = sectNumber;
    const header = (this.header = this.sect.loadSection(this.start));

    if (header.length > 20 && decode(header.subarray(16, 20)) == 'MOBI') {
      this.palm = false;
    } else if (this.sect.ident == 'TEXtREAd') {
      this.palm = true;
    } else {
      throw 'Unknown File Format';
    }

    this.records = struct.unpack('>H', header, 0x8)[0];

    this.title = decode(this.sect.palmname, 'windows-1252');
    this.length = header.length - 16;
    this.type = 3;
    this.codepage = 1252;
    /**
     * @type {number}
     */
    this.version = 0;
    this.exth_offset = this.length + 16;
    this.mlstart = this.sect.loadSection(this.start + 1).slice(0, 4);
    this.rawSize = 0;
    this.metadata = {};

    // set up for decompression/unpacking
    this.compression = struct.unpack('>H', header, 0x0)[0];
    if (this.compression === 0x4448) {
    } else if (this.compression === 2) {
      this.unpack = new PalmdocReader().unpack;
    } else if (this.compression === 1) {
    } else {
      throw new Error(
        `invalid compression type: 0x${this.compression.toString(16)}"`
      );
    }

    if (this.palm) return;

    [
      this.length,
      this.type,
      this.codepage,
      this.unique_id,
      this.version,
    ] = struct.unpack('>LLLLL', header.subarray(20, 40));

    const codec_map = {
      1252: 'windows-1252',
      65001: 'utf-8',
    };

    this.codec =
      this.codepage in codec_map ? codec_map[this.codepage] : codec_map[1252];

    const [toff, tlen] = struct.unpack('>II', header.subarray(0x54, 0x5c));
    this.title = decode(header.subarray(toff, toff + tlen), this.codec);
    const exth_flag = struct.unpack('>L', header.subarray(0x80, 0x84))[0];
    this.hasExth = exth_flag & 0x40;
    this.exth_offset = this.length + 16;
    this.exth_length = 0;
    if (this.hasExth) {
      this.exth_length = struct.unpack(
        '>L',
        this.header,
        this.exth_offset + 4
      )[0];
      this.exth_length = ((this.exth_length + 3) >> 2) << 2; // round to next 4 byte boundary
      this.exth = header.subarray(
        this.exth_offset,
        this.exth_offset + this.exth_length
      );
    }

    // parse the exth / metadata
    this.parseMetaData();

    this.crypto_type = struct.unpack('>H', this.header, 0xc)[0];

    // Start sector for additional files such as images, fonts, resources, etc
    // Can be missing so fall back to default set previously
    let ofst = struct.unpack('>L', this.header, 0x6c)[0];
    if (ofst != 0xfff) {
      this.firstresource = ofst + this.start;
    }
    ofst = struct.unpack('>L', this.header, 0x50)[0];
    if (ofst != 0xfff) {
      this.firstcontext = ofst + this.start;
    }

    if (this.isPrintReplica()) {
      return;
    }

    if (this.version < 8) {
      // Dictionary metaOrthIndex
      this.metaOrthIndex = struct.unpack('>L', this.header, 0x28)[0];
      if (this.metaOrthIndex != 0xfff) {
        this.metaOrthIndex += this.start;
      }

      // Dictionary metaOrthIndex
      this.metaInflIndex = struct.unpack('>L', this.header, 0x2c)[0];
      if (this.metaInflIndex != 0xfff) {
        this.metaInflIndex += this.start;
      }
    }

    // handle older headers without any ncxindex info and later
    // specifically 0xe4 headers
    if (this.length + 16 < 0xf8) {
      return;
    }

    // NCX Index
    this.ncxidx = struct.unpack('>L', this.header.slice(0xf4, 0xf8))[0];
    if (this.ncxidx != 0xfff) {
      this.ncxidx += this.start;
    }

    // K8 specific Indexes
    if (this.start != 0 || this.version == 8) {
      // Index into <xml> file skeletons in RawML
      this.skelidx = struct.unpack('>L', this.header, 0xfc)[0];
      if (this.skelidx != 0xfff) {
        this.skelidx += this.start;
      }

      // Index into <div> sections in RawML
      this.fragidx = struct.unpack('>L', this.header, 0xf8)[0];
      if (this.fragidx != 0xfff) {
        this.fragidx += this.start;
      }

      // Index into Other files
      this.guideidx = struct.unpack('>L', this.header, 0x104)[0];
      if (this.guideidx != 0xfff) {
        this.guideidx += this.start;
      }

      // dictionaries do not seem to use the same approach in K8's
      // so disable them
      this.metaOrthIndex = 0xffffffff;
      this.metaInflIndex = 0xffffffff;

      // need to use the FDST record to find out how to properly unpack
      // the rawML into pieces
      // it is simply a table of start and end locations for each flow piece
      this.fdst = struct.unpack('>L', this.header, 0xc0)[0];
      this.fdstcnt = struct.unpack('>L', this.header, 0xc4)[0];
      // if cnt is 1 or less, fdst section mumber can be garbage
      if (this.fdstcnt <= 1) {
        this.fdst = 0xfff;
      }
      if (this.fdst != 0xfff) {
        this.fdst += this.start;
        // setting of fdst section description properly handled in mobi_kf8proc
      }
    }
  }

  dumpheader() {}

  /**
   * @returns {boolean}
   */
  isPrintReplica() {
    // https://wiki.mobileread.com/wiki/AZW4
    return decode(this.mlstart.slice(0, 4)) === '%MOP';
  }

  /**
   * @returns {boolean}
   */
  isK8() {
    return this.start != 0 || this.version === 8;
  }

  /**
   * @returns {boolean}
   */
  isEncrypted() {
    return this.crypto_type != 0;
  }

  hasNCX() {
    return this.ncxidx != 0xff;
  }

  isDictionary() {
    return this.metaOrthIndex != 0xff;
  }

  decompress(data) {
    return this.unpack(data);
  }

  Language() {
    const langcode = struct.unpack('!L', this.header.subarray(0x5c, 0x60))[0];
    const langid = langcode & 0xff;
    const sublangid = (langcode >> 8) & 0xff;
    return getLanguage(langid, sublangid);
  }

  getRawML() {
    const getSizeOfTrailingDataEntry = (data) => {
      let num = 0;
      for (let v of data.slice(data.length - 4)) {
        console.log(v);
      }
    };

    const trimTrailingDataEntries = (data) => {
      console.log(trailers);
      for (let i = 0; i < trailers; i++) {
        num = getSizeOfTrailingDataEntry(data);
        data = data.slice(0, data.length - num);
      }
      if (multibyte) {
        num = data[data.length - 1] & (3 + 1);
        data = data.slice(0, data.length - num);
      }
      return data;
    };

    let multibyte = 0;
    let trailers = 0;
    console.log(this.sect.ident);
    if (this.sect.ident == 'BOOKMOBI') {
      const mobi_length = struct.unpack('>L', this.header, 0x14)[0];
      const mobi_version = struct.unpack('>L', this.header, 0x68)[0];
      if (mobi_length >= 0xe4 && mobi_version >= 5) {
        const flags = struct.unpack('>H', this.header, 0xf2)[0];
        multibyte = flags & 1;
        while (flags > 1) {
          if (flags & 2) {
            trailers++;
          }
          flags = flags >> 1;
        }
      }
    }
    // get raw mobi markup languge
    console.log('Unpacking raw markup language');
    const dataList = [];
    for (let i = 1; i < this.records + 1; i++) {
      const data = trimTrailingDataEntries(
        this.sect.loadSection(this.start + i)
      );
      dataList.push(this.unpack(data));
    }
  }

  // all metadata is stored in a dictionary with key and returns a *list* of values
  // a list is used to allow for multiple creators, multiple contributors, etc
  parseMetaData() {
    const addValue = (name, value) => {
      if (this.metadata[name] == null) {
        this.metadata[name] = [value];
      } else {
        this.metadata[name].push(value);
      }
    };

    if (this.hasExth) {
      let extheader = this.exth;
      const [_length, num_items] = struct.unpack(
        '>LL',
        extheader.subarray(4, 12)
      );
      extheader = extheader.subarray(12);

      let pos = 0;
      for (let i = 0; i < num_items; i++) {
        const [id, size] = struct.unpack(
          '>LL',
          extheader.subarray(pos, pos + 8)
        );
        const content = extheader.subarray(pos + 8, pos + size);

        if (id in MobiHeader.id_map_strings) {
          const name = MobiHeader.id_map_strings[id];
          addValue(name, decode(content, this.codec));
        } else if (id in MobiHeader.id_map_values) {
          const name = MobiHeader.id_map_values[id];
          if (size == 9) {
            const [value] = struct.unpack('B', content);
            addValue(name, value);
          } else if (size == 10) {
            const [value] = struct.unpack('>H', content);
            addValue(name, value);
          } else if (size == 12) {
            const [value] = struct.unpack('>L', content);
            if (id == 201 || id == 202) {
              if (value != 0xffffffff) {
                addValue(name, value);
              }
            } else {
              addValue(name, value);
            }
          } else {
            console(
              'Warning: Bad key, size, value combination detected in EXTH ',
              id,
              size,
              content
            );
            addValue(name, content);
          }
        }
        pos += size;
      }
    }
    this.metadata['Language'] = [this.Language()];
    this.metadata['Title'] = [this.title];
    this.metadata['Codec'] = [this.codec];
    this.metadata['UniqueID'] = [this.unique_id];
  }

  /**
   * @returns {object}
   */
  getMetaData() {
    return this.metadata;
  }

  describeHeader(DUMP) {
    console.log(`Mobi Version: ${this.version}`);
    console.log(`Codec: ${this.codec}`);
    console.log(`Title: ${this.title}`);
    if ('Updated_Title' in this.metadata) {
      console.log(`EXTH Title: ${this.metadata['Updated_Title'][0]}`);
    }
    if (this.compression === 0x4448) {
      console.log('Huffdic compression');
    } else if (this.compression === 2) {
      console.log('Palmdoc compression');
    } else if (this.compression === 1) {
      console.log('No compression');
    }
    if (DUMP) {
      this.dumpheader();
    }
  }
}
