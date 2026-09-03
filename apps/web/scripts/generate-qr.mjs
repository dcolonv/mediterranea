/**
 * Generate the booking QR code with the studio logo in the middle.
 *
 *   node scripts/generate-qr.mjs
 *
 * Writes public/qr-book.png at print resolution. Error correction level "H"
 * (~30% recoverable) lets the centred logo cover part of the pattern while the
 * code still scans; the script decodes the result afterwards to prove it does.
 */
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';

const TARGET_URL = 'https://www.mediterraneafacestudio.com/book';
const SIZE = 1400; // px — large enough to print sharply
const INK = '#34302b'; // brand ink
const BG = '#fcfbf9'; // brand cream
const LOGO_RATIO = 0.22; // logo box as a share of the QR width

const qr = await QRCode.toBuffer(TARGET_URL, {
  errorCorrectionLevel: 'H',
  width: SIZE,
  margin: 2,
  color: { dark: INK, light: BG },
});

// A cream plate behind the logo keeps it legible against the pattern.
const plate = Math.round(SIZE * LOGO_RATIO * 1.32);
const logoWidth = Math.round(SIZE * LOGO_RATIO);

// Round the monogram's corners so it sits neatly inside the rounded plate.
const roundedMask = Buffer.from(
  `<svg width="${logoWidth}" height="${logoWidth}">
     <rect width="${logoWidth}" height="${logoWidth}" rx="${Math.round(logoWidth * 0.14)}" fill="#fff"/>
   </svg>`
);

const logo = await sharp('public/logo_single.png')
  .resize({ width: logoWidth, height: logoWidth, fit: 'cover' })
  .composite([{ input: roundedMask, blend: 'dest-in' }])
  .png()
  .toBuffer();
const { height: logoHeight } = await sharp(logo).metadata();

const plateSvg = Buffer.from(
  `<svg width="${plate}" height="${plate}">
     <rect width="${plate}" height="${plate}" rx="${Math.round(plate * 0.12)}" fill="${BG}"/>
   </svg>`
);

await sharp(qr)
  .composite([
    { input: plateSvg, top: Math.round((SIZE - plate) / 2), left: Math.round((SIZE - plate) / 2) },
    {
      input: logo,
      top: Math.round((SIZE - logoHeight) / 2),
      left: Math.round((SIZE - logoWidth) / 2),
    },
  ])
  .png()
  .toFile('public/qr-book.png');

// Verify the finished image still decodes to the target URL.
const { data, info } = await sharp('public/qr-book.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);

if (decoded?.data !== TARGET_URL) {
  console.error(`QR verification FAILED — decoded: ${decoded?.data ?? 'nothing'}`);
  process.exit(1);
}
console.log(`public/qr-book.png ${info.width}x${info.height} — decodes to ${decoded.data}`);
