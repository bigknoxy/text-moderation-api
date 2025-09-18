#!/usr/bin/env bun
import { KeyStoreStatic } from '../src/services/auth/keyStoreStatic';

const argv = process.argv.slice(2);
const cmd = argv[0];
const ks = new KeyStoreStatic(process.env.KEY_STORE_PATH);

async function main() {
  if (!cmd || cmd === 'help') {
    console.log('Usage: key-manager [create|list|revoke] [--format json] [key]');
    process.exit(0);
  }

  const formatJson = argv.includes('--format') && argv[argv.indexOf('--format') + 1] === 'json';

  if (cmd === 'create') {
    const ak = await ks.createKey({ createdBy: 'cli' });
    if (formatJson) console.log(JSON.stringify(ak));
    else {
      if (ak.secretPlain) {
        console.log('Created key id:', ak.key);
        console.log('Secret (shown once):', ak.secretPlain);
      } else {
        console.log('Created key:', ak.key);
      }
    }
    process.exit(0);
  }

  if (cmd === 'list') {
    const list = await ks.listKeys();
    if (formatJson) console.log(JSON.stringify(list));
    else console.table(list);
    process.exit(0);
  }

  if (cmd === 'revoke') {
    const key = argv[1];
    if (!key) {
      console.error('Missing key to revoke');
      process.exit(2);
    }
    const ok = await ks.revokeKey(key);
    if (ok) {
      // Check if already revoked
      const list = await ks.listKeys();
      // Try to find the key by id or by hash
      const hashKey =
        key.length === 64 && /^[a-f0-9]+$/.test(key)
          ? key
          : require('crypto').createHash('sha256').update(key).digest('hex');
      const found = list.find((k) => k.key === key || k.key === hashKey);
      if (found && found.revoked && found.revoked === true) {
        // If already revoked, say Not found
        console.log('Not found');
        process.exit(0);
      } else {
        // If this is the first revoke, say Revoked
        console.log('Revoked');
        process.exit(0);
      }
    } else {
      console.log('Not found');
      process.exit(0);
    }
  }

  console.log('Unknown command');
  process.exit(2);
}

main().catch((err) => {
  console.error('CLI error:', err);
  process.exit(1);
});
