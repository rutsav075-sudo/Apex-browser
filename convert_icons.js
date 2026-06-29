/**
 * Convert SVG icon to PNG (256x256) and ICO for electron-builder
 * Uses sharp for high-quality rasterization
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
const svgPath = path.join(buildDir, 'icon.svg');

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate 256x256 PNG
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));
  console.log('✅ build/icon.png (256x256)');

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon512.png'));
  console.log('✅ build/icon512.png (512x512)');

  // Generate 1024x1024 PNG for macOS
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(buildDir, 'icon1024.png'));
  console.log('✅ build/icon1024.png (1024x1024)');

  // Generate ICO (256x256) for Windows
  // electron-builder can use PNG directly for Windows too, but let's also make a proper ICO
  const pngBuffer = await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toBuffer();

  // Simple ICO format: header + 1 entry + PNG data
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(1, 4); // Number of images

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);   // Width (256 = 0)
  entry.writeUInt8(0, 1);   // Height (256 = 0)
  entry.writeUInt8(0, 2);   // Color palette
  entry.writeUInt8(0, 3);   // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  entry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

  const ico = Buffer.concat([icoHeader, entry, pngBuffer]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
  console.log('✅ build/icon.ico (256x256 Windows)');

  console.log('\n🎯 All icons ready for electron-builder!');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
