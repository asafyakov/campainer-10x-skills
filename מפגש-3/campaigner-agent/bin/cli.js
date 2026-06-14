#!/usr/bin/env node
import { startServer } from '../src/server.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const PORT = parseInt(process.env.PORT || '3141', 10);

// Default: parent of campaigner-agent/ (= the user's project root).
// If an explicit path is passed as argv[2] — use that instead.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(join(__dirname, '..', '..'));

console.log(`
  ╔══════════════════════════════════════╗
  ║    Campaigner 10X — Agent Server     ║
  ╚══════════════════════════════════════╝

  Project: ${PROJECT_DIR}
  Port:    ${PORT}
`);

startServer(PORT, PROJECT_DIR);
