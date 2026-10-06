# Correction record

The earlier audit was addressed in the local project. No production deployment or external notification service has been configured.

| Audit issue | Correction | Verification |
| --- | --- | --- |
| Mobile header clipped controls | Compact header, responsive navigation breakpoint, wrapping hero/footer/estimator content | Browser checks at 320px and 375px; 320px page has no clipped content |
| Add/edit only changed browser storage | Authenticated multipart creation and editing; saved image files | API upload/edit tests and a browser full edit persisted after reload in isolated storage |
| False success on rejected admin requests | Shared request validation and error handling; changes appear after server confirmation | Invalid data and unauthenticated requests rejected without changing catalogue |
| Stale browser catalogue override | Public and admin views fetch server data; catalogue localStorage is ignored | Public JSON and API equality test; reload verification |
| Contact form only logged enquiries | Atomic private inbox storage, authenticated inbox UI, optional webhook | Enquiry persistence/privacy test; accurate saved-only response |
| Insecure client login and defaults | Removed fallback; verified JWT role/issuer/audience; private generated credentials; rate limiting | Default configuration rejection, fake-token rejection and rate-limit tests |
| Backend files publicly served | Only public frontend files and dedicated uploads route are served | Source, environment and enquiry paths return 404 |
| Duplicate frontend sources / hosting confusion | public/ is canonical; removed root frontend copies; explicit static build | Build passes and static portfolio tested in browser |
| Missing images and capitalization | Lowercase assets paths; originals packaged with descriptive gallery filenames | Build validates exact path capitalization for all catalogue images |
| Preview behind artwork details | Preview has a higher overlay level, with background focus suppression | Browser confirmed accessible preview over inert details |
| Back/refresh inconsistent | Gallery hash retained, popstate handled and stale dialogs closed | Browser Back closes overlays; reload retains gallery |
| Broken 404/fallback | Real 404 responses; no arbitrary SPA fallback or self-redirect | Missing files/pages tested |
| Duplicate artwork IDs | UUID-backed immutable IDs with unique safe slugs | Delete/recreate identity regression test |
| Made to Order filter | Separate Sold and Made to Order options; three-state admin cycle | Frontend and API filtering tests |
| Weak validation / ignored writes | Typed field checks, atomic writes, previous-version backup, corruption failures | Invalid input does not mutate storage; corrupt data preserved; backup test |
| HTML/script injection | Escaped catalogue text and safe image paths; delegated actions instead of inline handlers | Frontend injection and special-character regression tests |
| Undefined CSS tokens | Replaced undeclared tokens with existing design variables | Stylesheet inspection and browser layout checks |
| Keyboard/focus and storage recovery | Semantic category/image controls, overlay focus management, inactive layers, safe storage parsing | Browser dialogs/shortlist checked; malformed-storage test |
| Hidden-price leakage | Public API/static JSON redact hidden prices; old prices/totals/messages respect visibility | API, rendered-page and shortlist-message tests |
| Inconsistent photo updates | Replaced image updates fallback and gallery together; hero reflects catalogue | Photo update regression test |
| WhatsApp query encoding | Entire dynamic enquiry messages encoded once | Special-character shortlist regression test |
| SEO | Rendered unique artwork URLs and Product metadata; real-page sitemap; absolute social images | Sitemap/template tests and generated page opened in browser |
| Unverified content and counts | Unsupported testimonials withheld; counts are dynamic; business email consistent | Source review and visible catalogue count |
| No release checks | npm run check runs syntax, regression tests and complete static build | 18 regression tests and build passed |

## Remaining configuration before production

- Deploy the Node server with persistent STORAGE_DIR for a working CMS. GitHub Pages can host only the generated static portfolio.
- Credentials were rotated in private `.env`; old published defaults no longer work. Protect that file and set environment values privately on the host.
- Configure a trusted ENQUIRY_WEBHOOK_URL only if automatic notification is wanted. Without it, enquiries remain available in the Studio inbox, and the customer is accurately told this.
- Testimonials should only be restored after the owner verifies their provenance.
- This file-backed implementation supports one Node instance. Use a database before deploying multiple replicas.

See README.md for commands and hosting details.
