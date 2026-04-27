# Security Plan For New Projects

Purpose: keep this module reusable and clear when copied to another codebase.

## What We Already Have

- Secure session bootstrap
- CSRF token generation + validation
- Basic request throttle
- Auth + role helpers
- Default security headers

## What To Implement Next (Priority)

1. Trusted proxy allowlist before using forwarded IP headers.
2. Shared rate-limit storage (Redis/DB) for multi-server environments.
3. CSP nonce-based policy (avoid unsafe inline usage).
4. Login brute-force lockout with exponential backoff.
5. Production hardening check (`display_errors=0`, strict logging policy).

## Copy/Paste Starter Block

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Security/bootstrap.php';
```

## Definition Of Done (Security Baseline)

- HTTPS enforced in production
- CSRF protection active on state-changing forms
- Session cookies configured (`Secure`, `HttpOnly`, `SameSite`)
- Security headers visible in responses
- Error details not exposed to end users
