import { isAbsolute, resolve } from 'node:path';

const DEVELOPMENT_PORT = 8765;
const PRODUCTION_PORT = 8080;
export interface ServerConfig {
    port: number;
    host: string;
    databasePath: string;
    publicOrigin?: string;
    isProduction: boolean;
}

/**
 * Validate settings before opening a socket or creating a database.
 * @param {NodeJS.ProcessEnv} environment Non-sensitive process configuration.
 * @param {string} appRoot Base directory for the development database.
 * @returns {ServerConfig} Validated server settings.
 */
export function readConfig(
    environment: NodeJS.ProcessEnv = process.env,
    appRoot = process.cwd()
): ServerConfig {
    const isProduction = environment.NODE_ENV === 'production';
    const portText = environment.PORT ?? String(isProduction ? PRODUCTION_PORT : DEVELOPMENT_PORT);
    const port = Number(portText);
    if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535.');
    }
    const databasePath =
        environment.DB_PATH ?? (isProduction ? '' : resolve(appRoot, '.data/leaderboard.sqlite'));
    if (!databasePath || !isAbsolute(databasePath)) {
        throw new Error(
            'DB_PATH must be an absolute SQLite file path; production requires a persistent volume.'
        );
    }
    let publicOrigin: string | undefined;
    if (environment.PUBLIC_ORIGIN) {
        const url = new URL(environment.PUBLIC_ORIGIN);
        if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.pathname !== '/' ||
            url.search ||
            url.hash
        ) {
            throw new Error(
                'PUBLIC_ORIGIN must be an HTTP(S) origin without a path or credentials.'
            );
        }
        if (isProduction && url.protocol !== 'https:')
            throw new Error('Production PUBLIC_ORIGIN must use HTTPS.');
        publicOrigin = url.origin;
    }
    if (isProduction && !publicOrigin)
        throw new Error(
            'PUBLIC_ORIGIN is required in production, for example https://quiz.example.com.'
        );
    return {
        port,
        host: environment.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1'),
        databasePath,
        publicOrigin,
        isProduction,
    };
}
