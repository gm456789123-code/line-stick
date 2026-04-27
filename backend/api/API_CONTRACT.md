# CMS API Contract (v1.1)

Base URL (local):

`http://localhost/line-stick/backend/api`

## Endpoints

`GET /health`
- purpose: service health check
- response: `{ ok, status, php, time, db }`

`GET /public/stickers`
- purpose: public storefront list
- response: `{ ok, data: Sticker[] }` (active only)

`GET /public/stickers/{slug}`
- purpose: public sticker detail
- response: `{ ok, data: Sticker }` (active only)

`GET /public/settings`
- purpose: public site settings for storefront metadata/maintenance mode
- response: `{ ok, data: SiteSettings }`

`POST /public/orders`
- purpose: create customer order from storefront checkout
- body:
  - `customer.fullName` (required)
  - `customer.phone` (required)
  - `customer.lineId` (required)
  - `customer.note`
  - `items[]` (required)
- response: `{ ok, data: { orderId, paymentToken, status, total } }`

`GET /public/orders/{id}?token=...`
- purpose: load order for payment page
- response: `{ ok, data: Order }`

`POST /public/orders/{id}/upload-slip`
- purpose: upload transfer slip image before mark-paid
- form-data:
  - `token` (required)
  - `file` (required, jpg/jpeg/png/webp)
- response: `{ ok, data: { orderId, paymentSlipImage } }`

`POST /public/orders/{id}/mark-paid`
- purpose: customer confirms transfer payment
- body: `{ token }`
- response: `{ ok, data: Order }`

`GET /dashboard/summary`
- purpose: stats for CMS dashboard
- response:
  - `totalStickers`
  - `activeStickers`
  - `draftStickers`
  - `totalOrders`
  - `completedOrders`
  - `underReviewOrders`
  - `todayOrders`
  - `todayRevenue`
  - `serverStatus`
  - `lastUpdatedAt`

`POST /auth/login`
- body: `{ username, password }`
- admin roles:
  - `superadmin`
  - `dev`
  - `admin`
  - `editor`
- response: `{ ok, data: { user, csrfToken } }`

`GET /auth/me`
- response: `{ ok, data: { user } }`

`POST /auth/logout`
- response: `{ ok, message }`

`GET /admins`
- response: `{ ok, data: AdminUser[] }`
- roles: `superadmin | dev`

`POST /admins`
- body:
  - `username` (required)
  - `password` (required, min 8)
  - `role` (`admin|dev|editor`)
- response: `{ ok, data: AdminUser }`
- roles: `superadmin`

`GET /audit/logs?limit=100`
- response: `{ ok, data: AuditLog[] }`
- roles: `superadmin | dev`

`GET /settings/site`
- response: `{ ok, data: SiteSettings }`
- roles: `superadmin | dev | admin`

`PUT /settings/site`
- body:
  - `siteEnabled` (boolean)
  - `siteTitle` (string)
  - `siteDescription` (string)
  - `tabIconUrl` (string)
  - `tabPreviewImageUrl` (string)
  - `maintenanceMessage` (string)
- response: `{ ok, data: SiteSettings }`
- roles: `superadmin | dev | admin`

`GET /stickers`
- response: `{ ok, data: Sticker[] }`
- roles: `superadmin | dev | admin | editor`

`POST /stickers`
- body:
  - `name` (required)
  - `slug`
  - `price`
  - `count`
  - `status` (`active|draft`)
  - `coverImage`
  - `previewImages` (string[])
- response: `{ ok, data: Sticker }`
- roles: `superadmin | admin`

`PUT /stickers/{id}`
- body:
  - `name` (required)
  - `slug`
  - `price`
  - `status` (`active|draft`)
  - `coverImage`
  - `previewImages` (string[], required >= 1)
- response: `{ ok, data: Sticker }`
- roles: `superadmin | admin`

`DELETE /stickers/{id}`
- response: `{ ok, message }`
- roles: `superadmin | admin`

`GET /orders`
- response: `{ ok, data: Order[] }`
- roles: `superadmin | dev | admin | editor`

`POST /orders`
- body:
  - `customerName`
  - `items` (array)
  - `total`
- response: `{ ok, data: Order }`
- roles: `superadmin | admin`

`PUT /orders/{id}/status`
- body:
  - `status` (`pending_payment|under_review|completed|cancelled`)
- response: `{ ok, data: Order }`
- roles: `superadmin | dev | admin`

`POST /upload`
- form-data:
  - `file` (required)
- response: `{ ok, data: { filename, url } }`
- roles: `superadmin | admin`

## Storage

Current storage for bootstrap phase:
- `backend/storage/stickers.json`
- `backend/storage/orders.json`

Upload directory:
- `backend/uploads/stickers`

## MySQL (Required For Admin/Auth/Audit)

Admin accounts and admin activity logs are stored in MySQL:
- `cms_admin_users`
- `cms_admin_activity_logs`

Tables are auto-created on first API call if DB is reachable.

Required env keys (or defaults):
- `DB_HOST` (default `127.0.0.1`)
- `DB_PORT` (default `3306`)
- `DB_NAME` (default `line_stick`)
- `DB_USER` (default `root`)
- `DB_PASS` (default empty)

Default seeded users (first run only):
- `superadmin/super123`
- `admin/admin123`
- `dev/dev123`
- `editor/editor123`
