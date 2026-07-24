import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public");
const QUALITY = 85;
const SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".svg"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function svgDensity(filePath, sizeBytes) {
  if (sizeBytes > 5_000_000) {
    return 72;
  }

  if (sizeBytes > 1_000_000) {
    return 96;
  }

  if (filePath.includes(`${path.sep}simulation${path.sep}`)) {
    return 300;
  }

  return 150;
}

async function convertFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const outputPath = `${filePath.slice(0, -ext.length)}.webp`;
  const stats = await fs.stat(filePath);

  let pipeline =
    ext === ".svg"
      ? sharp(filePath, { density: svgDensity(filePath, stats.size) })
      : sharp(filePath);

  if (ext === ".svg" && stats.size > 500_000) {
    pipeline = pipeline.resize({ width: 2560, withoutEnlargement: true });
  }

  await pipeline.webp({ quality: QUALITY }).toFile(outputPath);
  await fs.unlink(filePath);

  return outputPath;
}

const files = await walk(ROOT);
let converted = 0;
let failed = 0;

for (const filePath of files) {
  const relative = path.relative(process.cwd(), filePath);

  try {
    const outputPath = await convertFile(filePath);
    converted += 1;
    console.log(`✓ ${relative} -> ${path.relative(process.cwd(), outputPath)}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${relative}: ${message}`);
  }
}

console.log(`\nDone. Converted ${converted}, failed ${failed}.`);
