# Logistics Hub - Freight Forwarding Platform

Production-ready B2B logistics platform for quote management, job tracking, and operations.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
cp .env.example .env.production
# Edit .env.production with your Supabase credentials
```

### 3. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Build for Production
```bash
npm run build
```

## Deployment

### GitHub
1. Push to GitHub repository
2. Netlify auto-deploys on push

### Environment Variables (Netlify)
Set these in Netlify Site Settings > Environment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_KEY`
- `VITE_APP_ENV`
- `VITE_API_URL`

### Database Setup
Run SQL files in Supabase (in order):
1. 01-auth-schema.sql
2. 02-master-data-schema.sql
3. 03-seed-master-data.sql
4. 04-seed-test-data.sql
5. 05-quotes-schema.sql
6. 06-jobs-operations-schema.sql
7. 07-line-item-catalog-schema.sql

### Test Credentials
- Email: demo@example.com
- Password: demo123456

## Project Structure

```
src/
├── components/      # 16 React components
├── hooks/          # Custom React hooks
├── utils/          # Utilities (API, Supabase, constants)
├── App.jsx
├── main.jsx
└── index.css

netlify/
└── functions/      # 6 API handlers (Netlify Functions)

public/
└── index.html
```

## Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Netlify Functions
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Hosting:** Netlify

## Features

- Quote management (create, edit, approve)
- Auto-approval logic (margin ≥15%)
- Job tracking with milestones
- Task management
- Document versioning & storage
- Exception tracking
- Pre-alert system
- Complete audit trail
- Team-based access control
- Admin panel

## Documentation

See separate documentation files:
- `TECHNICAL-DESIGN-RELEASE-1.md` - Architecture
- `API-SPECIFICATION.md` - API reference
- `OPERATIONS-MANUAL.md` - User guide
- `TEAM-TRAINING-PLAN.md` - Training

## Support

For deployment help, see:
- `SUNDAY-DEPLOYMENT-CHECKLIST.md`
- `SUNDAY-QUICK-REFERENCE.txt`

## License

Proprietary - GLA Norway AS
