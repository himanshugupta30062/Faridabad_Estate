# Faridabad Estate

**Find Your Place. Build Your Future.**

Faridabad Estate (also referred to in the project as Faridabad Estates / PropMitra) is a real-estate discovery and lead-management web application focused on Faridabad, Haryana. Visitors can explore property listings, narrow results with search filters, view property details and maps, save or compare properties, and contact the team or an AI property advisor.

## Live Website

🌐 **[Visit Faridabad Estate](https://property-mitra-2.emergent.host/)**

## Product Features

### Property discovery
- Browse featured properties and explore Faridabad localities, property categories, and budget collections.
- Search properties for **sale or rent** with filters for locality, price range, property type, bedrooms, bathrooms, area, furnishing, and possession.
- Switch between grid, list, and map views; sort results and use locality suggestions/autocomplete.
- View detailed property pages with image galleries/lightbox, location map, similar properties, and enquiry options.
- Compare properties, save favourites, and revisit recently viewed listings (visitor features).

### Estate Mitra — AI property advisor
- Conversational property discovery using visitor requirements and available listing data.
- Listing recommendations with match explanations and a path to human assistance.
- Enquiry/lead capture with conversation context, summary, and lead temperature.

### Enquiries & contact
- Property enquiry forms for callbacks, visits, and tours.
- WhatsApp contact from the site and property pages.
- Mobile-friendly sticky contact actions.

### Admin workspace
- Admin dashboard with overview statistics and property performance.
- Lead CRM: view and manage enquiries, status, notes, follow-up dates, and WhatsApp follow-ups.
- Export leads to CSV.
- Create, edit, and manage property listings and multiple property images.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Tailwind CSS, shadcn/ui, Radix UI, Lucide |
| Maps | Leaflet / React Leaflet with OpenStreetMap |
| Backend | Python, FastAPI, Pydantic |
| Database | MongoDB (Motor/PyMongo) |
| AI advisor | Server-side conversational integration (Estate Mitra) |
| Authentication | JWT-based accounts; admin access configured through environment allowlists |
| Email | Resend integration for hot-lead notifications |
| Testing | pytest (backend), React testing tools |

## Repository Structure

```
.
├── backend/
│   ├── server.py          # API, enquiries, admin operations, uploads
│   ├── site_api.py        # Public property search and website APIs
│   ├── chat.py            # Estate Mitra conversational advisor
│   ├── auth.py            # Authentication and access control
│   ├── catalog.py         # Listing normalization and locality catalog
│   ├── seed.py            # Sample property data
│   ├── db.py               # MongoDB connection
│   ├── storage.py          # File/object storage helpers
│   ├── emailer.py          # Lead email notifications
│   └── tests/              # Backend regression/API tests
├── frontend/
│   ├── src/pages/          # Home, search, property, compare, saved, admin
│   ├── src/components/     # Site, property, admin, and UI components
│   ├── src/lib/api.js      # Frontend API client/helpers
│   └── src/config/company.js # Business/contact configuration
├── memory/PRD.md            # Product requirements and implementation notes
└── README.md
```

## Local Development

### Prerequisites
- Node.js and Yarn/npm
- Python 3.11+ (align with your deployment runtime)
- MongoDB instance
- Required service credentials/configuration (see deployment environment)

### Backend
```bash
cd backend
python -m venv .venv
# Activate the virtual environment:
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

The Create React App/CRACO development server runs at [http://localhost:3000](http://localhost:3000).

### Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
yarn test
```

Run tests with the environment and database configuration expected by each test; some integration tests may require service access.

## Configuration & Deployment Notes

- Configure MongoDB, authentication/JWT secrets, admin allowlists, storage, AI provider credentials, and email settings using deployment environment variables/secrets. **Never commit production secrets.**
- Keep business name, address, phone, WhatsApp, and agent details centralized in `frontend/src/config/company.js`.
- WhatsApp contact is configured through `REACT_APP_WHATSAPP_NUMBER`; use the correct production number before launch.
- Admin sign-in is restricted by configured admin email allowlists. Review the allowlist and admin identity before production deployment.
- Email alerts for hot leads require valid Resend configuration, a real recipient, and available provider credits.
- The repository's seed/catalog includes **sample/demo property data**. Verify listing accuracy, availability, pricing, ownership/title claims, images, and locality details before presenting any listing as verified or current.
- Update placeholder team details, testimonials, and business/legal information (including applicable registration/RERA details) before making claims about them.

## Important Disclaimer

This website is a property discovery and enquiry platform, not a payment or property transaction system. Listing details, prices, availability, maps, and other information can change and should be independently confirmed. This README does not represent legal, title, RERA, or investment verification.

## Project Documentation

- [Product requirements & implementation notes](memory/PRD.md)
- [Frontend development notes](frontend/README.md)
- [Authentication testing notes](auth_testing.md)

## License

No license has been specified yet. All rights remain with the repository owner unless a license is added.
