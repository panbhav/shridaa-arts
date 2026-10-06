# Shridaa Arts

Handmade Lippan Art by Ashima Goyal. Contact: +91 9983466388, [WhatsApp](https://wa.me/919983466388), shridaaarts@gmail.com.

## Local website and Studio Manager

Requires Node.js 22 or later.

```sh
npm ci
npm run setup
npm start
```

Open http://localhost:3000 and http://localhost:3000/admin/. Setup generates private admin credentials and a JWT signing secret in `.env`; inspect that file locally to obtain the password. It preserves secure existing values and rotates known published defaults. Never commit `.env`. A bcrypt `ADMIN_PASSWORD_HASH` can replace the plaintext password setting. Changing the signing secret invalidates existing sessions.

## Source and persistence

- `public/`: the only maintained frontend source, with lowercase `assets/` paths.
- `lib/` and `server.js`: backend and rendered artwork pages.
- `data/artworks.json`: initial and default live catalogue, including hidden prices for authenticated administration.
- `data/enquiries.json`: private enquiry inbox, created on first submission.
- `data/uploads/`: new image uploads, served through `/assets/uploads/`.
- `Assets/`: original source photographs retained for reference; never served by the backend.
- `dist/`: generated static deployment output. Never edit it directly.

Set `STORAGE_DIR` to an absolute persistent folder when hosting Node. First startup seeds the catalogue from `data/artworks.json`; subsequent starts use persistent storage. Run **one Node instance** against that folder. Atomic replacement and a previous-version `.bak` protect saves; take independent backups. Corrupt data stops startup or returns an error instead of silently replacing the catalogue. Multiple replicas require a shared database and distributed rate limiting.

## Enquiries

Enquiries are saved on the server and visible in the authenticated Studio inbox. Without a notification integration, customers see that the enquiry was saved and are offered WhatsApp for a quicker response. The artist must check the inbox.

Optionally configure `ENQUIRY_WEBHOOK_URL` and `ENQUIRY_WEBHOOK_TOKEN` for a trusted JSON POST endpoint. It receives the submitted name, phone/email, message, artwork ID and timestamp. Only configure a destination authorized to receive those enquiries. Notification failure does not lose the enquiry. No external notification service is configured by default.

## Hosting

**Working CMS:** deploy this Node application with private environment settings and persistent `STORAGE_DIR`, behind HTTPS. Do not publish the repository directory through a static server. Express serves only approved frontend files and uploads; source files and enquiries remain private.

**Static portfolio / GitHub Pages:** run `npm run build`, then publish **the contents of `dist/`**, not the repository root or `public/`. The output includes assets, sitemap and individual artwork pages. Artist links are hidden and the contact form is replaced with WhatsApp. Static hosting cannot run the CMS. Direct static admin access reports that a server is required and never pretends to save browser-only changes.

Artwork pages at `/artwork/<slug>/` include unique metadata and Product structured data. Interactive preview and shortlist remain in the main portfolio. Existing `#artwork=<id>` links work. Counts come from catalogue data. Unsupported review ratings and testimonials are withheld pending owner verification.

## Validation

```sh
npm run check
```

Runs syntax checks, isolated API/security/persistence tests, then a build validating exact image capitalization, unique IDs/slugs and generated pages. Tests use temporary storage and never modify the live catalogue. Verify narrow mobile widths and Back/refresh after navigation or layout changes.

These commands do not deploy the website.
