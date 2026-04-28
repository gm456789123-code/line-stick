# Frontend (Next.js) + WordPress Headless

This frontend is powered by Next.js and reads content from WordPress REST API.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## WordPress Source

Set this in `frontend/.env.local`:

```env
NEXT_PUBLIC_WP_BASE_URL=http://localhost/line-stick/backend
```

## Content Flow

- Home (`/`) reads items from WordPress `Stickers` custom post type.
- If no stickers exist, it falls back to regular posts.
- Dynamic routes resolve content by slug from:
- `page`
- `post`
- `sticker`

## Quick Setup in WordPress

1. Open WP Admin and go to `Stickers`.
2. Create a sticker item with:
- Title
- Content (optional detail page content)
- Featured Image (optional)
- Sticker Settings: `Price`, `Sticker Count`, `Badge`, `Emoji Fallback`
3. Publish, then refresh `http://localhost:3000`.
