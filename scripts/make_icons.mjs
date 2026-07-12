// Render public/icon.svg to PNGs for PWA / iOS Add-to-Home-Screen.
// Requires `sharp` which is already installed as a transitive dep of Next.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const svg = fs.readFileSync(path.resolve("public/icon.svg"));
const out = "public";

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const { name, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(path.join(out, name));
  console.log("wrote", name);
}
