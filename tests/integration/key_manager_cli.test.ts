import { describe, it, expect } from 'bun:test';
import path from 'path';
import fs from 'fs/promises';

const CLI = path.join(process.cwd(), 'cli', 'key-manager.ts');
const storePath = path.join(process.cwd(), 'data', `cli_test_keys_${Date.now()}.json`);

// Helper to run the CLI with a custom key store path
async function runCli(args: string[], opts: { env?: any } = {}) {
  const env = { ...process.env, KEY_STORE_PATH: storePath, ...opts.env };
  const proc = Bun.spawnSync(['bun', 'run', CLI, ...args], { env });
  const text = proc.stdout ? proc.stdout.toString() : '';
  const err = proc.stderr ? proc.stderr.toString() : '';
  return { code: proc.exitCode, text, err };
}

describe('key-manager CLI', () => {
  it('creates a key and shows secret', async () => {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.rm(storePath, { force: true }).catch(() => {});
    const { code, text } = await runCli(['create', '--format', 'json']);
    expect(code).toBe(0);
    const obj = JSON.parse(text);
    expect(obj.key).toBeTruthy();
    expect(obj.secretPlain).toBeTruthy();
  });

  it('lists keys', async () => {
    const { code, text } = await runCli(['list', '--format', 'json']);
    expect(code).toBe(0);
    const arr = JSON.parse(text);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
  });

  it('revokes a key and confirms', async () => {
    // Create a key
    const { text } = await runCli(['create', '--format', 'json']);
    const obj = JSON.parse(text);
    // Revoke it
    const { code, text: revokeText } = await runCli(['revoke', obj.key]);
    expect(code).toBe(0);
    expect(revokeText).toMatch(/Revoked|Not found/);
    // Revoke again (should be Not found)
    const { text: revokeText2 } = await runCli(['revoke', obj.key]);
    expect(revokeText2).toMatch(/Not found/);
  });

  it('errors on missing key for revoke', async () => {
    const { code, err } = await runCli(['revoke']);
    expect(code).toBe(2);
    expect(err).toMatch(/Missing key/);
  });

  it('shows help for unknown command', async () => {
    const { code, text } = await runCli(['foobar']);
    expect(code).toBe(2);
    expect(text).toMatch(/Unknown command/);
  });
});
