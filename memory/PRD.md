# PropMitra → Faridabad Estates — PRD

## Original problem
AI real estate brokerage website, first built for UrbanNest Properties in Hyderabad and later moved to **Faridabad Estates**, Faridabad, Haryana. Tagline: "Find Your Place. Build Your Future." The AI advisor is **Estate Mitra**. Visitors can discover properties, search with filters and talk to the AI advisor. Leads go into an admin CRM. WhatsApp click-to-chat is available, and Hot leads trigger email alerts. No payments or transactions.

## Architecture
- FastAPI + MongoDB.
- Backend files: server.py (enquiries, admin, upload), site_api.py (search, neighbourhoods, insights, favourites, sitemap, search-meta), chat.py (Estate Mitra SSE chat on Claude Sonnet 5.5 via the Emergent key), auth.py (JWT admin/visitor accounts plus Emergent Google sign-in limited to ADMIN_EMAILS), emailer.py (Resend-managed email, Hot leads only), catalog.py and seed.py (Faridabad SAMPLE listings and neighbourhoods).
- React frontend with Tailwind, shadcn and Leaflet (OpenStreetMap).
- Business details (phone, WhatsApp, address) are kept in one config file: src/config/company.js.

## Implemented
- Homepage: hero, search, Explore links (locality, type, budget, buy/rent), featured listings, neighbourhoods, collections, advisory, team placeholders, market insights, demo testimonials, enquiry CTA.
- Search: filters, sorting, grid/list/map views, compare, favourites (visitor accounts), recently viewed. Default sort is by distance from Sector 10. Locality search has autocomplete.
- Property detail pages: gallery and lightbox, SEO JSON-LD, map, similar homes, enquiry forms (visit/tour/callback), WhatsApp, a sticky call-to-action bar on mobile.
- Estate Mitra: queries real listings, explains why each one matches, offers human handoff, saves leads with summary, temperature and transcript.
- Admin: stats, sources, property performance, follow-ups, leads CRM (notes, status, follow-up date, editable WhatsApp message, CSV export), listings CRUD with multiple images.
- WhatsApp: floating button, property buttons and admin follow-up all use 918920785645 (REACT_APP_WHATSAPP_NUMBER). Tested in iteration 2: all passed.
- Hot-lead email alert goes to LEAD_ALERT_EMAIL. **Sending is currently blocked by insufficient Emergent credits**, and the recipient is a test address.

## Backlog
- Real alert recipient email; top up credits.
- Admin email switched to a Faridabad Estates address; Google admin emails added to the allowlist.
- Genuine company details: RERA number, registration, team, testimonials.
- Old Hyderabad test leads to be cleared if wanted.
