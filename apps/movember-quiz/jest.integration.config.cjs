module.exports = {
    ...require('./jest.config.cjs'),
    displayName: 'movember-quiz-integration',
    testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'],
};
