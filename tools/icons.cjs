// Renders logo.svg into the PWA icons. Run: node tools/icons.cjs (needs the sharp package)
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..'), svg = fs.readFileSync(path.join(dir, 'logo.svg'), 'utf8');
const square = svg.replace('rx="116"', 'rx="0"');
// maskable: full-bleed background, figure scaled into the 80% safe zone
const mask = square.replace(/<g fill="none"/, '<g transform="translate(51.2 51.2) scale(.8)" fill="none"');
(async () => {
  await sharp(Buffer.from(svg)).resize(192).png().toFile(path.join(dir, 'icon-192.png'));
  await sharp(Buffer.from(svg)).resize(512).png().toFile(path.join(dir, 'icon-512.png'));
  await sharp(Buffer.from(square)).resize(180).png().toFile(path.join(dir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(mask)).resize(512).png().toFile(path.join(dir, 'icon-512-maskable.png'));
  console.log('icons ok');
})();
