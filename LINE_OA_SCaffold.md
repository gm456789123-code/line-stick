# LINE OA Scaffold (Ready for Later)

This project now includes a scaffold for LINE Official Account integration.
It is intentionally not fully implemented yet, so core work can continue first.

## What is already prepared

- WordPress REST status endpoint: `GET /wp-json/linestick/v1/line/status`
- WordPress REST webhook placeholder: `POST /wp-json/linestick/v1/line/webhook`
- Signature verification helper for `x-line-signature`
- Frontend helper to read LINE OA config and query backend status

## Files

- `backend/wp-content/mu-plugins/line-stick-line-oa-support.php`
- `frontend/lib/line-oa.ts`
- `frontend/.env.example`

## Environment variables

Add these to project root `.env` (used by `Shield::env`):

```env
LINE_OA_ENABLED=false
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_LIFF_ID=
```

Add these to `frontend/.env.local`:

```env
NEXT_PUBLIC_LINE_OA_ENABLED=false
NEXT_PUBLIC_LINE_LIFF_ID=
NEXT_PUBLIC_WP_BASE_URL=http://localhost/line-stick/backend
```

## Behavior now

- If `LINE_OA_ENABLED=false`: webhook returns `503` with scaffold-disabled message.
- If enabled and signature invalid: webhook returns `401`.
- If enabled and signature valid: webhook returns `501` (handler is intentionally pending).

## Later implementation checklist

1. Parse `events` payload from LINE webhook.
2. Implement reply flow via LINE Messaging API.
3. Add idempotency and logging for retries.
4. Add LIFF login or deep-link flow in frontend.
5. Move secrets to secure production secret manager.
