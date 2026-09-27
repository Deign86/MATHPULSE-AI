const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const avatarsDir = '/c/Users/Deign/AppData/Local/hermes/hermes-agent/MATHPULSE-AI/public/avatars';
fs.mkdirSync(avatarsDir, { recursive: true });

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type);
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function createSimplePNG(w, h, r, g, b) {
  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0);
    for (let x = 0; x < w; x++) {
      raw.push(r, g, b);
    }
  }
  const rawBuf = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.from([0,0,0,13, 0,0,0,w, 0,0,0,h, 8, 2, 0, 0, 0])),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(avatarsDir, 'default-male.png'), createSimplePNG(128, 128, 91, 151, 237));
fs.writeFileSync(path.join(avatarsDir, 'default-female.png'), createSimplePNG(128, 128, 237, 130, 175));
fs.writeFileSync(path.join(avatarsDir, 'default-neutral.png'), createSimplePNG(128, 128, 180, 180, 180));
console.log('Created placeholder avatar PNGs');