import { unpackBook } from './mobi/unpack.mjs';

const input = document.getElementById('file-input');

const readFileAsArrayBuffer = (file) => {
  const fr = new FileReader();

  return new Promise((resolve, reject) => {
    fr.onload = (event) => {
      resolve(event.target.result);
    };

    fr.onerror = (err) => {
      reject(err);
    };

    fr.readAsArrayBuffer(file);
  });
};

input.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files.length) {
    const file = files[0];
    readFileAsArrayBuffer(file).then((buffer) => {
      const bytes = new Uint8Array(buffer);
      unpackBook(bytes);
    });
  }
});
