import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const input = process.argv[2] ?? 'src/img/Squint-Logo.jpg';

const buffer = await readFile(input);
const before = await sharp(buffer).metadata();

const output = await sharp(buffer)
  .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();

const after = await sharp(output).metadata();

console.log(
  `sharp OK (libvips ${sharp.versions.vips}): ${input}`,
  `${before.width}x${before.height} -> ${after.width}x${after.height},`,
  `${output.length} Bytes JPEG`,
);
