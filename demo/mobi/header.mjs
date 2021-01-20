import { Sectionizer } from './sectionizer.mjs'
import { getUint16, getUint32, decode } from './utils.mjs'
import * as struct from './struct.mjs'

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
  }

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
  }

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
  }

  metadata = {}

  /**
   * @param {Sectionizer} sect
   * @param {number} sectNumber
   */
  constructor(sect, sectNumber) {
    this.sect = sect
    this.start = sectNumber
    const header = (this.header = this.sect.loadSection(this.start))

    console.log(new TextDecoder('utf-8').decode(header.subarray(16, 20)))

    const records = getUint16(header, 0x8)
    console.log(`records: ${records}`)

    const compression = getUint16(header)
    console.log(`compression: ${compression}`)
    const length = getUint32(header.subarray(20), 0)
    const type = getUint32(header.subarray(20), 4 * 1)
    const codepage = getUint32(header.subarray(20), 4 * 2)
    const unique_id = getUint32(header.subarray(20), 4 * 3)
    const version = getUint32(header.subarray(20), 4 * 4)
    console.log(length, type, codepage, unique_id, version)

    const codec_map = {
      1252: 'windows-1252',
      65001: 'utf-8',
    }

    this.codec = codepage in codec_map ? codec_map[codepage] : codec_map[1252]

    const toff = getUint32(header, 0x54)
    const tlen = getUint32(header, 0x54 + 4)
    const t = decode('utf-8', header.subarray(toff, toff + tlen))
    console.log(`title: ${t}`)
    const exth_flag = getUint32(header.subarray(0x80, 0x84))
    this.hasExth = exth_flag & 0x40
    let exth_offset = length + 16
    if (this.hasExth) {
      let exth_length = getUint32(header, exth_offset + 4)
      exth_length = ((exth_length + 3) >> 2) << 2 // round to next 4 byte boundary
      console.log(`exth_length: ${exth_length}`)
      this.exth = header.subarray(exth_offset, exth_offset + exth_length)
    }

    // parse the exth / metadata
    this.parseMetaData()
  }

  // all metadata is stored in a dictionary with key and returns a *list* of values
  // a list is used to allow for multiple creators, multiple contributors, etc
  parseMetaData() {
    const addValue = (name, value) => {
      if (this.metadata[name] == null) {
        this.metadata[name] = value
      } else {
        if (!Array.isArray(this.metadata[name])) {
          this.metadata[name] = [this.metadata[name]]
        }
        this.metadata[name].push(value)
      }
    }

    if (this.hasExth) {
      let extheader = this.exth
      const [_length, num_items] = struct.unpack(
        '>LL',
        extheader.subarray(4, 12)
      )
      extheader = extheader.subarray(12)

      let pos = 0
      for (let i = 0; i < num_items; i++) {
        const [id, size] = struct.unpack(
          '>LL',
          extheader.subarray(pos, pos + 8)
        )
        const content = extheader.subarray(pos + 8, pos + size)

        if (id in MobiHeader.id_map_strings) {
          const name = MobiHeader.id_map_strings[id]
          addValue(name, decode(this.codec, content))
        } else if (id in MobiHeader.id_map_values) {
          const name = MobiHeader.id_map_values[id]
          if (size == 9) {
            const [value] = struct.unpack('B', content)
            console.log(`${name}${value}`)
            // addValue(name, decode("utf-8", value));
          } else if (size == 10) {
            const [value] = struct.unpack('>H', content)
            addValue(name, value)
          } else if (size == 12) {
            const [value] = struct.unpack('>L', content)
            if (id == 201 || id == 202) {
              if (value != 0xffffffff) {
                addValue(name, value)
              }
            } else {
              addValue(name, value)
            }
          } else {
            console(
              'Warning: Bad key, size, value combination detected in EXTH ',
              id,
              size,
              content
            )
            addValue(name, content)
          }
        }
        pos += size
      }
    }
    console.log(this.metadata)
  }
}
