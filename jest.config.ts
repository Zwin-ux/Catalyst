import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsconfig: 'tsconfig.json',
        },
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
