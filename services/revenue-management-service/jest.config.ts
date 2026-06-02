import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '@stayflexi/shared-types': '<rootDir>/../../packages/shared-types/src/index.ts',
    '@stayflexi/shared-errors': '<rootDir>/../../packages/shared-errors/src/index.ts',
    '@stayflexi/shared-logger': '<rootDir>/../../packages/shared-logger/src/index.ts',
    '@stayflexi/shared-config': '<rootDir>/../../packages/shared-config/src/index.ts',
    '@stayflexi/shared-events': '<rootDir>/../../packages/shared-events/src/index.ts',
    '@stayflexi/shared-validation': '<rootDir>/../../packages/shared-validation/src/index.ts',
    '@stayflexi/shared-database': '<rootDir>/../../packages/shared-database/src/index.ts',
    '@stayflexi/shared-auth': '<rootDir>/../../packages/shared-auth/src/index.ts',
    '@stayflexi/shared-observability': '<rootDir>/../../packages/shared-observability/src/index.ts',
  },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**', '!src/main.ts', '!src/tracing.ts'],
  testTimeout: 10000,
}

export default config
