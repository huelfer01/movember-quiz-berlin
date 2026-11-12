module.exports = {
    displayName: 'movember-quiz',
    testEnvironment: 'node',
    moduleNameMapper: { '^(node:)?sqlite$': '<rootDir>/test/sqlite-bridge.cjs' },
    testMatch: ['<rootDir>/server/src/**/*.spec.ts'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: { '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }] },
    collectCoverageFrom: [
        'server/src/config.ts',
        'server/src/application.ts',
        'server/src/database.ts',
    ],
    coverageDirectory: '../../coverage/apps/movember-quiz',
};
