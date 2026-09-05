export type ApiKey = {
  key: string;
  createdAt: number;
  revoked?: boolean;
  meta?: Record<string, unknown>;
  // Optional raw secret returned only at creation time (shown once)
  secretPlain?: string;
};

export interface KeyStore {
  createKey(meta?: Record<string, unknown>): Promise<ApiKey>;
  listKeys(): Promise<ApiKey[]>;
  revokeKey(key: string): Promise<boolean>;
  verifyKey(key: string): Promise<boolean>;
}
