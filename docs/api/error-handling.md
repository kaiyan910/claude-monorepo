- **Custom error classes only** — extend `HttpException` with a `readonly code` property. Never use bare `throw new Error()` or `throw new HttpException()`.
- **Controllers**: No `try/catch` — let errors propagate to `CustomExceptionFilter`.
- **Infrastructure layer**: Wrap external calls in `try/catch`, re-throw as custom `HttpException` subclass. Never leak infrastructure errors (e.g., `PrismaClientKnownRequestError`).
- **NestJS internal errors**: Framework-thrown exceptions (e.g., 404 for invalid paths, 405 method not allowed) must also be intercepted by `CustomExceptionFilter` and converted to the Standard Error Response format before returning to the client. No raw NestJS/Express error shape should ever reach the client.

```typescript
export class NotFoundError extends HttpException {
  readonly code = 'NOT_FOUND';
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}
```

### Standard Error Response

```json
{
  "httpCode": 404,
  "code": "NOT_FOUND",
  "message": "User not found",
  "traceId": "87b9a4c3-6eaa-4553-aaee-5809729a13c3",
  "createdAt": "2026-03-24T00:00:00.000Z"
}
```

`code` is for frontend translation mapping — clients use this, not `message`, for user-facing text.