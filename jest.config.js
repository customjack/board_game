const sharedConfig = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(seedrandom)/)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!src/js/index.js',
    '!src/js/plugins/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js',
        '!**/tests/unit/MapEditorController*.test.js',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    },
    {
      ...sharedConfig,
      displayName: 'map-editor',
      testMatch: [
        '**/tests/unit/MapEditorController*.test.js',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.mapeditor.js'],
    },
  ],
};
