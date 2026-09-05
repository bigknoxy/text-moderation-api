import type { ApiKey, KeyStore } from './keyStore';

export class KeyStoreInMemory implements KeyStore {
  private store: Map<string, ApiKey> = new Map();

  async createKey(meta: Record<string, unknown> = {}): Promise<ApiKey> {
    const key = (Math.random() + 1).toString(36).substring(2, 12) + Date.now().toString(36);
    const ak: ApiKey = { key, createdAt: Date.now(), meta };
    this.store.set(key, ak);
    return ak;
  }

  async listKeys(): Promise<ApiKey[]> {
    return Array.from(this.store.values());
  }

  async revokeKey(key: string): Promise<boolean> {
    const v = this.store.get(key);
    if (!v) return false;
    v.revoked = true;
    this.store.set(key, v);
    return true;
  }

  async verifyKey(key: string): Promise<boolean> {
    const v = this.store.get(key);
    if (!v) return false;
    if (v.revoked) return false;
    return true;
  }
}
