# PropMitra — PRD

## Original problem
AI-powered real estate website "PropMitra" for UrbanNest Properties (Hyderabad). Visitors can find properties, filter listings, ask an AI property advisor questions, and send qualified buy, rent or sell enquiries. It also has a protected admin dashboard for leads and listings. No transactions, legal verification or payments.

## User choices
- LLM: Claude Sonnet 5.5 (Emergent LLM key)
- Admin auth: Email/password (JWT cookies) + Emergent Google sign-in (allowlist ADMIN_EMAILS)
- Lead temperature: automatic by AI (admin can override)
- Listing images: paste URL or upload (Emergent object storage)
- "Simple and effective"

## Architecture
- Backend FastAPI: server.py (listings, enquiries, admin, upload/files), chat.py (SSE chat, 2-step LLM: extraction → DB matching → streamed reply, lead upsert), auth.py, storage.py, seed.py
- Mongo collections: properties, leads, chat_sessions, users, user_sessions, login_attempts, files
- Frontend React: Home (hero, filters, listings, about, testimonials, contact form, chat widget), /admin/login, /admin (Overview, Leads, Listings tabs)

## Implemented (Nov 2026)
- 8 sample listings seeded, each marked "Sample listing"
- Working filters: Buy/Rent, location, budget, type and bedrooms
- Property Mitra chatbot: recommends only matching active DB listings, handles no-match honestly, collects name and phone (validates 10-digit Indian mobile), saves the lead with AI summary, temperature, matched refs and transcript, and restores the chat after a reload
- Website callback form also creates leads, with AI summary and temperature
- Admin: stats (total, intent split, temperature, top locations, budget buckets), leads table with filter and search, and a lead detail sheet (requirements, matches, transcript, summary, WhatsApp copy plus wa.me link, temperature and status override). Listings can be added, edited and deactivated, with URL or upload images
- Tested by the testing agent (iteration_1); fixed issues: login lockout behind the ingress, no-match prompt, duplicate chat cards, capitalisation

## Backlog
- P1: Lead notes and follow-up reminders; export leads as CSV
- P1: Image gallery (multiple photos per listing)
- P2: Email/WhatsApp alert to admin on new Hot lead; multiple admin users management UI
