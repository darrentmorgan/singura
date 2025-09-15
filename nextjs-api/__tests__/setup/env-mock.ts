/**
 * Environment variable mocking utilities for tests
 */

interface ProcessEnvBackup {
  [key: string]: string | undefined;
}

export function mockEnvVars(vars: Record<string, string>): ProcessEnvBackup {
  const backup: ProcessEnvBackup = {};
  
  Object.keys(vars).forEach(key => {
    backup[key] = process.env[key];
    (process.env as any)[key] = vars[key];
  });
  
  return backup;
}

export function restoreEnvVars(backup: ProcessEnvBackup): void {
  Object.keys(backup).forEach(key => {
    if (backup[key] === undefined) {
      delete (process.env as any)[key];
    } else {
      (process.env as any)[key] = backup[key];
    }
  });
}