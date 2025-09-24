#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function gzipFile(src, dest) {
  const data = await fs.readFile(src);
  const gzipped = zlib.gzipSync(data, { level: 9 });
  await fs.writeFile(dest, gzipped);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../');
  const chatsDir = path.join(repoRoot, 'docs', 'chats');
  const outRoot = path.join(repoRoot, 'dev-workspace', 'chat-archives');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(outRoot, `archive-${ts}`);
  await ensureDir(outDir);

  // Candidate JSONs (ignored by git) that we want to preserve offline
  const candidates = [
    'watermelon-hydrogen-copilot_sessions-2025-09-24T20-45-42-598Z.json',
    'watermelon-hydrogen-copilot_memento-2025-09-24T20-45-42-598Z.json',
    'watermelon-hydrogen-interactive.sessions-2025-09-24T20-44-04-144Z.json',
  ];

  const manifest = { createdAt: new Date().toISOString(), files: [] };

  for (const name of candidates) {
    const src = path.join(chatsDir, name);
    try {
      const stat = await fs.stat(src);
      if (!stat.isFile()) continue;
      const dest = path.join(outDir, `${name}.gz`);
      await gzipFile(src, dest);
      manifest.files.push({
        name,
        src,
        archived: dest,
        sizeBytes: stat.size,
        gzSizeBytes: (await fs.stat(dest)).size,
      });
    } catch {
      // skip missing files
      continue;
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Archived ${manifest.files.length} file(s) to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
