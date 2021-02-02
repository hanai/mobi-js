import { Sectionizer } from './sectionizer.mjs';
import { MobiHeader } from './header.mjs';
import { decode } from './utils.mjs';

const K8_BOUNDARY = 'BOUNDARY';

const process_all_mobi_headers = (
  apnxfile,
  sect,
  mhlst,
  K8Boundary,
  k8only = False,
  epubver = '2',
  use_hd = False
) => {};

export const unpackBook = (file, opts) => {
  opts = Object.assign({ epubver: '2', use_hd: false }, opts);
  const { epubver, use_hd } = opts;
  let apnxfile = null;
  const sect = new Sectionizer(file);

  if (decode(sect.ident) != 'BOOKMOBI' && decode(sect.ident) != 'TEXtREAd') {
    throw new Error('Invalid file format');
  }

  const mhlst = [];
  let mh = new MobiHeader(sect, 0);
  mhlst.push(mh);
  let K8Boundary = -1;

  let hasK8;
  if (mh.isK8()) {
    console.log('Unpacking a KF8 book...');
    hasK8 = true;
  } else {
    // This is either a Mobipocket 7 or earlier, or a combi M7/KF8
    // Find out which
    hasK8 = false;

    for (let i = 0; i < sect.sectionoffsets.length - 1; i++) {
      const [before, after] = sect.sectionoffsets.slice(i, i + 2);
      if (after - before == 8) {
        const data = sect.loadSection(i);
        if (data == K8_BOUNDARY) {
          sect.setsectiondescription(i, 'Mobi/KF8 Boundary Section');
          mh = MobiHeader(sect, i + 1);
          hasK8 = True;
          mhlst.push(mh);
          K8Boundary = i;
          break;
        }
      }
    }
    if (hasK8) {
      console.log(`Unpacking a Combination M${mh.version}/KF8 book...`);
    } else {
      console.log(`Unpacking a Mobipocket ${mh.version} book...`);
    }
  }
  if (hasK8) {
    files.makeK8Struct();
  }

  process_all_mobi_headers(
    apnxfile,
    sect,
    mhlst,
    K8Boundary,
    false,
    epubver,
    use_hd
  );
};
