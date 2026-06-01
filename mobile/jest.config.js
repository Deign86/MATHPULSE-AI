module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: { exclude: ['**/__tests__/**'] },
      },
    ],
  },
  // Do NOT transform .js files with babel — avoids babel.config.js plugin issues
  transformIgnorePatterns: [
    'node_modules/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^firebase/auth/react-native$': '<rootDir>/__mocks__/firebase-auth-react-native.js',
  },
};
