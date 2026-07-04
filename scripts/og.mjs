// Renders the social preview card (1200x630) from inline SVG via sharp.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#2e4dff" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#2e4dff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#0a0d12" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pane" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbe4ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#2e4dff" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0d12"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(890,315)">
    <rect x="-110" y="-110" width="220" height="220" rx="48" fill="url(#pane)" opacity="0.35" transform="rotate(-16)"/>
    <rect x="-110" y="-110" width="220" height="220" rx="48" fill="url(#pane)" opacity="0.55" transform="rotate(-4)"/>
    <rect x="-110" y="-110" width="220" height="220" rx="48" fill="url(#pane)" opacity="0.85" transform="rotate(10)"/>
  </g>
  <text x="90" y="200" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="#5b76ff" letter-spacing="6">ALTAVIZ</text>
  <text x="90" y="300" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#f1f5f9">Catch the anomaly before</text>
  <text x="90" y="380" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#f1f5f9">it eats your margin.</text>
  <text x="90" y="450" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#94a3b8">AI media buying copilot · anomaly detection · MCP server</text>
</svg>`;

mkdirSync("public", { recursive: true });
await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("public/og.png written");
