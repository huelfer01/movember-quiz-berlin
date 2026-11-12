import { describe, expect, it } from '@jest/globals';

import { readConfig } from './config.ts';

describe('readConfig', () => {
    it('should use local defaults when running in development', () => {
        expect(readConfig({}, '/tmp/quiz')).toEqual({
            port: 8765,
            host: '127.0.0.1',
            databasePath: '/tmp/quiz/.data/leaderboard.sqlite',
            publicOrigin: undefined,
            isProduction: false,
        });
    });
    it('should accept explicit production configuration when storage and origin are provided', () => {
        expect(
            readConfig({
                NODE_ENV: 'production',
                DB_PATH: '/data/scores.sqlite',
                PUBLIC_ORIGIN: 'https://quiz.example.com',
                PORT: '9000',
                HOST: '0.0.0.0',
            })
        ).toEqual({
            port: 9000,
            host: '0.0.0.0',
            databasePath: '/data/scores.sqlite',
            publicOrigin: 'https://quiz.example.com',
            isProduction: true,
        });
    });
    it('should use port 8080 when production has no explicit port', () => {
        expect(
            readConfig({
                NODE_ENV: 'production',
                DB_PATH: '/data/scores.sqlite',
                PUBLIC_ORIGIN: 'https://quiz.example.com/',
            }).port
        ).toBe(8080);
    });
    it.each(['0', '-1', '65536', '12x', '', 'NaN', '1.5'])(
        'should reject the invalid port %s',
        (PORT) => {
            expect(() => readConfig({ PORT })).toThrow('PORT');
        }
    );
    it('should reject missing storage when running in production', () => {
        expect(() => readConfig({ NODE_ENV: 'production' })).toThrow('DB_PATH');
    });
    it('should reject a relative database path when supplied', () => {
        expect(() => readConfig({ DB_PATH: 'scores.sqlite' })).toThrow('DB_PATH');
    });
    it('should reject a missing public origin when running in production', () => {
        expect(() =>
            readConfig({ NODE_ENV: 'production', DB_PATH: '/data/scores.sqlite' })
        ).toThrow('PUBLIC_ORIGIN');
    });
    it.each([
        'https://quiz.example.com/path',
        'https://user:pass@quiz.example.com',
        'ftp://quiz.example.com',
        'https://quiz.example.com/?x=1',
        'https://quiz.example.com/#fragment',
    ])('should reject the invalid public origin %s', (PUBLIC_ORIGIN) => {
        expect(() => readConfig({ PUBLIC_ORIGIN })).toThrow('PUBLIC_ORIGIN');
    });
    it('should reject HTTP when the public deployment is production', () => {
        expect(() =>
            readConfig({
                NODE_ENV: 'production',
                DB_PATH: '/data/scores.sqlite',
                PUBLIC_ORIGIN: 'http://quiz.example.com',
            })
        ).toThrow('HTTPS');
    });
    it('should allow HTTP origins when testing locally', () => {
        expect(readConfig({ PUBLIC_ORIGIN: 'http://localhost:8765' }).publicOrigin).toBe(
            'http://localhost:8765'
        );
    });
});
