const sharp = require('sharp');
const path = require('path');

async function convert(src, dst, width, height, quality) {
  await sharp(src)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(dst);
  const info = await sharp(dst).metadata();
  console.log(`${dst}: ${info.width}x${info.height}, ${Math.round((require('fs').statSync(dst).size) / 1024)} KB`);
}

(async () => {
  await convert('src/assets/NeuroCerebro.png', 'src/assets/print-neurocerebro.webp', 500, 447, 85);
  await convert('src/assets/NeuoMobius.png', 'src/assets/print-neuomobius.webp', 1240, 373, 85);
})().catch(e => { console.error(e); process.exit(1); });
