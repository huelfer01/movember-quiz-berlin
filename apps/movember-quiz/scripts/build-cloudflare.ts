import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./package.mjs');
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(workspaceRoot, 'dist/cloudflare-pages');
// This directory is generated solely for upload; discard stale deployment assets.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(appRoot, 'quiz'), output, {
    recursive: true,
    filter: (source) => !source.endsWith('.d.ts') && !source.endsWith('.DS_Store'),
});
console.log('Cloudflare Pages upload folder: ' + output);
console.log('Create D1 from server/schema.sql, bind it as LEADERBOARD_DB, and redeploy.');
