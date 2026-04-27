# Security Module (PHP 8.3 Ready)

Reusable security core for PHP projects with:

- Secure session bootstrap
- CSRF token generation and verification
- Request throttling (session-based)
- Basic auth/session helpers
- Role check helper (`RBAC`)
- Security headers + optional CSP
- Optional audit logging via PDO

## Quick Start

```php
require_once __DIR__ . '/Security/bootstrap.php';
```

Or manual:

```php
require_once __DIR__ . '/Security/Shield.php';
Shield::init();
```

## Environment Keys (Optional)

- `FORCE_HTTPS=true|false`
- `SESSION_SAMESITE=Lax|Strict|None`
- `CONTENT_SECURITY_POLICY=...`

## Notes

- This module is framework-agnostic.
- `EliteShield` is kept only for backward compatibility.
- If a global `$pdo` exists, audit logs can be stored in DB.

## Drop-In Setup Checklist

Use this checklist in every new project:

1. Add `require_once __DIR__ . '/Security/bootstrap.php';` at the entry point.
2. Set env values:
   - `APP_ENV=production`
   - `FORCE_HTTPS=true`
   - `SESSION_SAMESITE=Lax` (or `Strict` when possible)
   - `CONTENT_SECURITY_POLICY=...`
3. Ensure HTTPS is active before enabling `FORCE_HTTPS=true`.
4. Provide global `$pdo` only if you want audit logs in DB.
5. Verify login/logout flow with CSRF token check enabled.
6. Validate all security headers from browser devtools.
