import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * List client folders under projectDir/clients/ (or Hebrew variants).
 * Each folder with a CLAUDE.md is considered a client.
 */
export function listClients(projectDir) {
  const clientsDirNames = ['clients', 'לקוחות', 'לקוחות סוכנות'];
  let clientsDir = null;

  // First check for a clients subfolder
  for (const name of clientsDirNames) {
    const candidate = join(projectDir, name);
    if (existsSync(candidate)) { clientsDir = candidate; break; }
  }

  // If no subfolder found, check if projectDir itself contains client folders
  // (each subfolder with CLAUDE.md is a client)
  if (!clientsDir) {
    const directClients = readdirSync(projectDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => {
        const folder = join(projectDir, d.name);
        const hasClaude = existsSync(join(folder, 'CLAUDE.md'));
        return { name: d.name, folder, hasClaude };
      })
      .filter((c) => c.hasClaude);
    if (directClients.length > 0) return directClients;
    return [];
  }

  return readdirSync(clientsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const folder = join(clientsDir, d.name);
      const hasClaude = existsSync(join(folder, 'CLAUDE.md'));
      return { name: d.name, folder, hasClaude };
    })
    .filter((c) => c.hasClaude);
}

/**
 * Read a file from a client folder.
 */
export function readClientFile(projectDir, clientFolder, filename) {
  // Try direct path first (client folders directly in projectDir)
  const directPath = join(projectDir, clientFolder, filename);
  if (existsSync(directPath)) return readFileSync(directPath, 'utf-8');

  // Try under clients subdirectories
  const clientsDirNames = ['clients', 'לקוחות', 'לקוחות סוכנות'];
  for (const name of clientsDirNames) {
    const filePath = join(projectDir, name, clientFolder, filename);
    if (existsSync(filePath)) return readFileSync(filePath, 'utf-8');
  }
  return null;
}
