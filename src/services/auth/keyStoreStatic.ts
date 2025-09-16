import { createHmac, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { ApiKey, KeyStore } from './keyStore';

const DEFAULT_STORE = path.join(process.cwd(), 'data', 'keys.json');
const REPO_SALT = process.env.REPO_SALT || 'default_repo_salt_change_me';

function hashKey(raw: string) {
  return createHmac('sha256', REPO_SALT).update(raw).digest('hex');
}

export class KeyStoreStatic implements KeyStore {
  private filePath: string;
  private cache: Map<string, ApiKey> = new Map();

  constructor(filePath = DEFAULT_STORE) {
    this.filePath = filePath;
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const arr = JSON.parse(raw) as ApiKey[];
      this.cache = new Map(arr.map((a) => [a.key, a]));
    } catch (err) {
      this.cache = new Map();
    }
  }

  private async persist(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(Array.from(this.cache.values()), null, 2),
      'utf-8'
    );
  }

  async createKey(meta: Record<string, unknown> = {}): Promise<ApiKey> {
    await this.load();
    const raw = randomBytes(32).toString('hex');
    const id = hashKey(raw);
    const ak: ApiKey = { key: id, createdAt: Date.now(), meta };
    this.cache.set(id, ak);
    await this.persist();
    // Return the stored id AND the raw secret (secret shown once to the operator)
    return { ...ak, secretPlain: raw };
  }

  async listKeys(): Promise<ApiKey[]> {
    await this.load();
    return Array.from(this.cache.values());
  }

  async revokeKey(key: string): Promise<boolean> {
    await this.load();
    // Accept either the stored key id or the raw secret
    let id = key;
    if (!this.cache.has(id)) {
      id = hashKey(key);
    }
    const v = this.cache.get(id);
    if (!v) return false;
    v.revoked = true;
    this.cache.set(id, v);
    await this.persist();
    return true;
  }

  async verifyKey(key: string): Promise<boolean> {
    await this.load();
    const id = hashKey(key);
    const v = this.cache.get(id);
    if (!v) return false;
    if (v.revoked) return false;
    return true;
  }
}
