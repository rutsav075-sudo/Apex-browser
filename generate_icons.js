/**
 * Generate Apex app icon from the search bar SVG logo
 * Renders to 256x256 PNG for electron-builder
 */
const fs = require('fs');
const path = require('path');

// The exact SVG from ApexLogo.jsx — the neon "A" chevron
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="18" fill="#0d0d1a"/>
  <defs>
    <linearGradient id="apexNeon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff" />
      <stop offset="100%" stop-color="#bf00ff" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path 
    d="M 50 5 L 15 80 L 30 80 L 50 32 L 70 80 L 85 80 Z" 
    fill="url(#apexNeon)" 
    filter="url(#glow)"
  />
  <path 
    d="M 50 48 L 35 80 L 50 70 L 65 80 Z" 
    fill="url(#apexNeon)" 
    filter="url(#glow)"
  />
</svg>`;

// Write SVG icon
const iconPath = path.join(__dirname, 'build', 'icon.svg');
const buildDir = path.join(__dirname, 'build');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(iconPath, svgContent);
console.log('✅ SVG icon written to build/icon.svg');

// Also write a 512x512 version
const svg512 = svgContent.replace('width="256" height="256"', 'width="512" height="512"');
fs.writeFileSync(path.join(buildDir, 'icon512.svg'), svg512);

// Write a 1024x1024 version for macOS
const svg1024 = svgContent.replace('width="256" height="256"', 'width="1024" height="1024"');
fs.writeFileSync(path.join(buildDir, 'icon1024.svg'), svg1024);

console.log('✅ All icon sizes generated in build/');
console.log('   - build/icon.svg (256x256)');
console.log('   - build/icon512.svg (512x512)');
console.log('   - build/icon1024.svg (1024x1024)');
