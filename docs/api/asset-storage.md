- **Strategy pattern** via `StorageService` interface — switchable by `STORAGE_DRIVER` env var (`local | s3 | azure`).
- All application code uses the abstraction. Never call storage SDKs directly outside provider implementations.
- Use UUID-based keys (not original filenames). Validate file type/size before upload.
- Use time-limited signed URLs for private assets.

```typescript
export interface StorageService {
  upload(key: string, file: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
```