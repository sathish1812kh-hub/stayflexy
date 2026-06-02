import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'docs',     // documentation only
        'style',    // formatting, no logic change
        'refactor', // code change without fix or feature
        'perf',     // performance improvement
        'test',     // adding or fixing tests
        'chore',    // maintenance, dependency bumps
        'ci',       // CI/CD changes
        'revert',   // revert a commit
        'build',    // build system changes
        'infra',    // infrastructure changes
      ],
    ],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 200],
    'scope-case': [2, 'always', 'kebab-case'],
  },
}

export default config
