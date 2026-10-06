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

**GitHub Pages with lightweight Studio Manager:** no Node hosting, database or customer inbox is needed. Customers use WhatsApp and email directly. The admin at `/admin/` edits `data/artworks.json` and uploads optimized photos into `public/assets/artworks/` through the GitHub API. Each save creates one commit on `main`, including catalogue and photo. The Actions workflow tests, builds and deploys `dist/`. After switching to Actions, `gh-pages` is no longer the publishing source.

One-time configuration:

1. Commit and push these source changes, including `.github/workflows/pages.yml`, to `main`.
2. In repository **Settings > Pages > Build and deployment**, select **GitHub Actions**. Preserve the custom domain `shridaaarts.com` and HTTPS. Run **Publish portfolio** in Actions manually if its first run happened before changing this setting.
3. From the GitHub account allowed to write `panbhav/shridaa-arts`, create a **fine-grained personal access token**, selecting **only this repository**, with **Contents: Read and write** and an expiry. No Workflows or Actions write permission is required. Organization approval or branch rules may additionally apply.
4. Open `https://shridaaarts.com/admin/` and paste the token to connect. Add/edit an artwork and save. Use **Check publishing progress** to confirm deployment succeeded before checking the public site. Saving to GitHub and deploying are separate stages.

The token stays in private JavaScript memory for the open tab and is cleared on sign-out. Refreshing requires reconnecting. Never commit a token, put it in source code, share it with customers or enter it on an untrusted copy of the admin page. Anyone can open the page, but only an authorized token can publish. Repository changes are versioned; rollback is possible through GitHub. The editor refuses to overwrite concurrent branch updates; **Reload Catalogue** loads the latest version before retrying. Branch protection can reject direct writes; configure owner access appropriately rather than force-pushing.

`npm run build` generates static output with GitHub-mode administration and direct-contact links. Node remains available for optional server-hosted CMS use; it is not required by this GitHub Pages flow.

Artwork pages at `/artwork/<slug>/` include unique metadata and Product structured data. Interactive preview and shortlist remain in the main portfolio. Existing `#artwork=<id>` links work. Counts come from catalogue data. Unsupported review ratings and testimonials are withheld pending owner verification.

## Validation

```sh
npm run check
```

Runs syntax checks, isolated API/security/persistence tests, then a build validating exact image capitalization, unique IDs/slugs and generated pages. Tests use temporary storage and never modify the live catalogue. Verify narrow mobile widths and Back/refresh after navigation or layout changes.

These commands do not deploy the website.
