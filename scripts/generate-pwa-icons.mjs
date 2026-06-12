// Genera le icone PWA (sigillo Norma) da SVG → PNG con sharp.
// Sorgente di verità del marchio: src/components/ui/seal-mark.tsx (sigillo scanalato + monogramma N).
// Esegui a mano quando il marchio cambia: `node scripts/generate-pwa-icons.mjs`.
// Output: public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-icon.png (committati).
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const TERRACOTTA = "#bc4b2b";
const AVORIO = "#f7f2e8";

// Sigillo scanalato (ceralacca): n "bozzi" su una circonferenza — identico a seal-mark.tsx.
function scallop(cx, cy, r, bumps) {
  const step = (Math.PI * 2) / bumps;
  let d = "";
  for (let i = 0; i < bumps; i++) {
    const a = i * step;
    const a2 = a + step;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    if (i === 0) d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
    d += `A ${(r * 0.52).toFixed(2)} ${(r * 0.52).toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} `;
  }
  return d + "Z";
}

// Marchio in avorio su fondo terracotta. `scale` rimpicciolisce il sigillo per la safe-zone maskable.
function sealGroup(scale = 1) {
  const SCALLOP = scallop(20, 20, 17, 14);
  return `<g transform="translate(20 20) scale(${scale}) translate(-20 -20)">
    <path d="${SCALLOP}" stroke="${AVORIO}" stroke-width="1.4" stroke-linejoin="round" fill="none" />
    <circle cx="20" cy="20" r="12.2" stroke="${AVORIO}" stroke-width="0.9" opacity="0.45" fill="none" />
    <g stroke="${AVORIO}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M13.4 26.6V13.4" />
      <path d="M13.4 13.4L26.6 26.6" />
      <path d="M26.6 26.6V16.4L24.2 14" />
    </g>
  </g>`;
}

// Icona "normale": fondo terracotta con angoli arrotondati, sigillo a piena dimensione.
function roundedSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect width="40" height="40" rx="9" fill="${TERRACOTTA}" />
    ${sealGroup(1)}
  </svg>`;
}

// Icona maskable: fondo a pieno bleed, sigillo entro la safe-zone (~72%) per non essere tagliato.
function maskableSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect width="40" height="40" fill="${TERRACOTTA}" />
    ${sealGroup(0.72)}
  </svg>`;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");

async function render(svg, size, file) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(path.join(pub, file), png);
  console.log(`✓ ${file} (${size}px)`);
}

await mkdir(pub, { recursive: true });
await render(roundedSvg(), 192, "icon-192.png");
await render(roundedSvg(), 512, "icon-512.png");
await render(maskableSvg(), 512, "icon-512-maskable.png");
await render(roundedSvg(), 180, "apple-icon.png");
console.log("Fatto.");
