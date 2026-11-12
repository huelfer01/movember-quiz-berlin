import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Existing browser assets stay unchanged. Generate one answer key for both hosts.
await import('./package.mjs');
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(workspaceRoot, 'dist/apps/movember-quiz');
await mkdir(output, { recursive: true });
await cp(resolve(appRoot, 'quiz'), resolve(output, 'quiz'), { recursive: true });
await cp(resolve(appRoot, 'server/src'), resolve(output, 'server/src'), {
    recursive: true,
    filter: (source) => !source.endsWith('.spec.ts'),
});
await cp(resolve(appRoot, 'server/schema.sql'), resolve(output, 'server/schema.sql'));
const metadata = JSON.parse(await readFile(resolve(appRoot, 'package.json'), 'utf8')) as {
    name: string;
    engines: { node: string };
};
await writeFile(
    resolve(output, 'package.json'),
    JSON.stringify(
        {
            name: metadata.name,
            private: true,
            type: 'module',
            engines: metadata.engines,
            scripts: { start: 'node server/src/main.ts' },
        },
        null,
        2
    ) + '\n'
);
console.log('Ready-to-run Node application: ' + output);
