# User Dashboard (React/Next.js)

## Features
- Secure login with JWT
- User profile display
- Risk scores with visual indicators and suggestions
- Contact admin form (API + mailto)
- Responsive, professional UI
- Modular TypeScript components
- API integration for user profile, risk review, and support

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Folder Structure
- `pages/` — Next.js pages (login, dashboard)
- `src/components/` — UI components
- `src/context/` — User context (session management)
- `src/services/` — API integration
- `src/styles/` — Global styles

## API Endpoints
- `POST /auth/login` — Authenticate user
- `GET /user/profile` — Get user profile
- `GET /analytics/risk-review` — Get user risk scores
- `POST /support/ticket` — Submit support message

## Customization
- Update `NEXT_PUBLIC_API_BASE_URL` in `.env.local` if needed.
- Update admin email in `ContactAdminForm.tsx` for mailto link.
