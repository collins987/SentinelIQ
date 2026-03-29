# SentinelIQ Frontend - Visual Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SENTINELIQ FRONTEND                      │
│                       (4 Independent Services)                   │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │   WELCOME PAGE (5000)    │
                    │  - Role Selection        │
                    │  - Central Entry Point   │
                    └──────────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
        ┌───────────▼──────┐ ┌───────▼────────┐ ┌────▼──────────────┐
        │  ADMIN PORTAL    │ │ ANALYST PORTAL │ │ VIEWER DASHBOARD  │
        │   (Port 3000)    │ │  (Port 4100)   │ │  (Port 4000)      │
        ├──────────────────┤ ├────────────────┤ ├───────────────────┤
        │ Tech: Vite+React │ │ Tech: Next.js  │ │ Tech: Next.js     │
        │ Auth: localStorage│ │ Auth: session  │ │ Auth: localStorage│
        │ Role: admin      │ │ Role: analyst  │ │ Role: viewer      │
        │ RBAC: ✓          │ │ RBAC: ✓        │ │ RBAC: ✓           │
        └──────────────────┘ └────────────────┘ └───────────────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
        ┌──────────────────────────▼───────────────────────────┐
        │         BACKEND API (Port 8000)                      │
        │  - Authentication & Authorization                    │
        │  - Data Management                                   │
        │  - Business Logic                                    │
        └────────────────────────────────────────────────────────┘
```

---

## 🔄 User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. USER ARRIVES
   └─> localhost:5000/welcome
       ├─> Load Welcome Page
       └─> Display Role Selection

2. ROLE SELECTION
   └─> User clicks role button:
       ├─> Admin → localhost:3000/login
       ├─> Analyst → localhost:4100 (with login)
       └─> Viewer → localhost:4000 (with login)

3. LOGIN PAGE LOADS
   └─> Display login form
       ├─> User enters credentials
       └─> Submit to backend

4. BACKEND AUTHENTICATION
   ┌─────────────────┐
   │ Validate Email  │ ✓
   │ Validate Pass   │ ✓
   │ Check Role      │ ✓
   └────────┬────────┘
            │
       ┌────▼──────┐
       │ Success?  │
       └┬──────────┘
        │
    ┌───┴─────────┐
    │             │
   YES            NO
    │             │
    ▼             ▼
  Return        Return
  Token+        Error
  Role          Message

5. TOKEN STORAGE
   └─> Store in localStorage/sessionStorage:
       ├─> token (JWT)
       ├─> role (admin/analyst/viewer)
       └─> user (user details)

6. DASHBOARD ACCESS
   └─> ProtectedRoute checks:
       ├─> Token exists? ──NO──> Redirect to /login
       ├─> Role valid?   ──NO──> Redirect to /unauthorized
       └─> Both OK?      ──YES─> Load Dashboard

7. SESSION PERSISTENCE
   └─> Session survives:
       ├─> Page refresh ✓
       ├─> Navigation ✓
       └─> Browser close (localStorage only) ✓
```

---

## 🔐 RBAC (Role-Based Access Control) Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         RBAC FLOW                                │
└─────────────────────────────────────────────────────────────────┘

USER ATTEMPTS TO ACCESS PAGE
│
├─> URL: localhost:3000/admin
│
└─> Route triggers ProtectedRoute()
   │
   ├─> Check: Token exists?
   │   ├─> YES: Continue
   │   └─> NO: Redirect to /login
   │
   ├─> Check: User role matches allowed?
   │   ├─> YES (admin): Load Dashboard
   │   └─> NO (analyst/viewer): Redirect to /unauthorized
   │
   └─> Show /unauthorized page
       ├─> "Access Denied" message
       ├─> "Return to Welcome" button
       └─> "Go Back" button
```

---

## 📊 Service Port Map

```
┌──────────────┬──────────┬────────────┬──────────────────┐
│   Service    │   Port   │   Tech     │      Role        │
├──────────────┼──────────┼────────────┼──────────────────┤
│ Welcome      │   5000   │ Next.js 14 │ Entry Point      │
│ Admin        │   3000   │ Vite+React │ admin            │
│ Analyst      │   4100   │ Next.js 14 │ analyst          │
│ Viewer       │   4000   │ Next.js 14 │ viewer/user      │
│ Backend API  │   8000   │ FastAPI    │ Auth + Data      │
└──────────────┴──────────┴────────────┴──────────────────┘
```

---

## 🎨 UI Component Hierarchy

```
WELCOME PAGE (Port 5000)
│
├─ Navbar
│  ├─ Logo
│  ├─ Menu Items (Home, Features, About, Contact)
│  └─ Sign In Button
│
├─ Hero Section
│  ├─ Left Column
│  │  ├─ Main Heading
│  │  ├─ Description
│  │  ├─ Search Bar
│  │  └─ Supporting Text
│  │
│  └─ Right Column
│     ├─ Hero Image Placeholder
│     ├─ Curved Background
│     └─ Floating Elements
│
├─ Role Selection Section
│  ├─ Section Title
│  ├─ Admin Portal Card
│  │  ├─ Gradient Header
│  │  ├─ Icon
│  │  ├─ Name
│  │  ├─ Description
│  │  └─ Access Button
│  │
│  ├─ Analyst Portal Card
│  │  └─ [Same structure]
│  │
│  └─ Viewer Portal Card
│     └─ [Same structure]
│
└─ Footer
   ├─ Copyright
   └─ Links (Privacy, Terms, Contact)
```

---

## 🔄 Session & Token Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              SESSION & TOKEN MANAGEMENT                         │
└─────────────────────────────────────────────────────────────────┘

LOGIN SUCCESSFUL
│
├─> Backend returns:
│   ├─ token: "eyJhbGciOiJIUzI1NiIs..."
│   ├─ refreshToken: "eyJhbGciOiJIUzI1NiIs..."
│   └─ user: { id, email, role, name }
│
└─> Frontend stores:
    │
    ADMIN (localStorage):
    │
    ├─ key: "token"           ──> value: JWT token
    ├─ key: "refreshToken"    ──> value: Refresh token
    └─ key: "user"            ──> value: User object
    │
    ANALYST (sessionStorage):
    │
    ├─ key: "analyst_token"   ──> value: JWT token
    └─ key: "analyst_user"    ──> value: User object
    │
    VIEWER (localStorage):
    │
    ├─ key: "token"           ──> value: JWT token
    └─ key: "user"            ──> value: User object

SESSION PERSISTENCE:
│
├─ Page loaded
│   └─> Check localStorage/sessionStorage
│       ├─ Token found? ──> Restore session
│       └─ Token not found? ──> Show login

LOGOUT:
│
└─> Clear all tokens
    ├─ Remove from storage
    └─ Redirect to welcome page
```

---

## 🌐 API Call Flow

```
┌──────────────┐
│   Frontend   │
│   Dashboard  │
└──────┬───────┘
       │ 1. User Action
       │    (click, form submit)
       ▼
   ┌─────────────────────┐
   │ Create API Request  │
   │ Include Token in    │
   │ Authorization Header│
   └──────┬──────────────┘
          │
          ▼
   ┌──────────────────────┐
   │   BACKEND API        │
   │   - Validate Token   │
   │   - Check Role       │
   │   - Process Request  │
   │   - Return Data      │
   └──────┬───────────────┘
          │
       200 OK
       ├─ user_id
       ├─ alerts
       ├─ risk_score
       └─ ...data
          │
          ▼
   ┌──────────────────────┐
   │ Update UI Component  │
   │ Store in State/Cache │
   │ Render Updated View  │
   └──────────────────────┘
```

---

## 📈 Role Hierarchy & Permissions

```
┌──────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                             │
└──────────────────────────────────────────────────────────────┘

                       ADMIN
                      /  |  \
                     /   |   \
                    /    |    \
        Dashboard Users Audit  Governance
         |         |    |      |
         ▼         ▼    ▼      ▼
      Full      Create  View  Configure
      Control   Manage  Logs  Rules
      
                    ANALYST
                    /  |  \
                   /   |   \
                  /    |    \
            Alerts  Investigate  Insights
              |        |          |
              ▼        ▼          ▼
           View    Create      Analyze
           Alerts  Cases       Threats
           
                     VIEWER
                     /  |  \
                    /   |   \
                   /    |    \
              Reports Dashboard Profile
                |        |       |
                ▼        ▼       ▼
              View     View    Manage
              Reports  Stats   Settings


PERMISSION MATRIX:
┌────────────┬───────┬─────────┬────────┐
│ Feature    │ Admin │ Analyst │ Viewer │
├────────────┼───────┼─────────┼────────┤
│ Dashboard  │  ✓    │    ✓    │   ✓    │
│ Users      │  ✓    │    ✗    │   ✗    │
│ Alerts     │  ✓    │    ✓    │   ✗    │
│ Reports    │  ✓    │    ✓    │   ✓    │
│ Settings   │  ✓    │    ✗    │   ✓    │
│ Governance │  ✓    │    ✗    │   ✗    │
└────────────┴───────┴─────────┴────────┘
```

---

## 🎯 Unauthorized Access Prevention

```
┌──────────────────────────────────────────────────────────┐
│         HOW UNAUTHORIZED ACCESS IS BLOCKED               │
└──────────────────────────────────────────────────────────┘

SCENARIO 1: Direct URL Access
│
├─ User (analyst) tries to access:
│  localhost:3000/admin
│
└─> AdminRoute component:
    ├─> Check: role === 'admin'?
    │   └─> false (user is analyst)
    │
    └─> Redirect to: /unauthorized
        └─> Show 403 error page


SCENARIO 2: Copy JWT Token
│
├─ User copies analyst token
├─ Tries to use it as admin
│
└─> Backend API:
    ├─> Decode token
    ├─> Verify role in token
    │   └─> role is 'analyst', not 'admin'
    │
    └─> Return 403 Forbidden
        └─> Frontend shows unauthorized page


SCENARIO 3: Modify localStorage
│
├─ User edits localStorage
├─ Changes role from 'viewer' to 'admin'
│
└─> Frontend ProtectedRoute:
    ├─> Check token validity
    │   └─> Token mismatch (doesn't have admin claims)
    │
    └─> Redirect to /unauthorized


DEFENSE LAYERS:
│
1. Frontend: ProtectedRoute checks role
2. Backend: Token validation & role check
3. API: Authorization header verification
4. Database: Row-level security
5. Browser: localStorage access restrictions
```

---

## 📱 Responsive Design Breakpoints

```
┌───────────────────────────────────────────────────────┐
│        WELCOME PAGE RESPONSIVE LAYOUT                 │
└───────────────────────────────────────────────────────┘

DESKTOP (1024px+)
┌──────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Menu | Sign In                        │
├──────────────────────────────────────────────────────┤
│          Left (50%)        │       Right (50%)        │
│ - Heading                  │ - Hero Image             │
│ - Description              │ - Curved Background      │
│ - Search Bar               │ - Floating Elements      │
│ - Supporting Text          │                          │
├──────────────────────────────────────────────────────┤
│ Role Cards (3 columns)                               │
│ ┌─────┐  ┌─────┐  ┌─────┐                            │
│ │Card1│  │Card2│  │Card3│                            │
│ └─────┘  └─────┘  └─────┘                            │
├──────────────────────────────────────────────────────┤
│ FOOTER: Copyright | Links                            │
└──────────────────────────────────────────────────────┘

TABLET (768px - 1024px)
┌──────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Menu (collapsed) | Sign In            │
├──────────────────────────────────────────────────────┤
│     Stacked Layout                                   │
│ - Heading (full width)                               │
│ - Description (full width)                           │
│ - Search Bar (full width)                            │
│ - Hero Image (full width, smaller)                   │
├──────────────────────────────────────────────────────┤
│ Role Cards (2 columns)                               │
│ ┌─────┐  ┌─────┐                                     │
│ │Card1│  │Card2│                                     │
│ └─────┘  └─────┘                                     │
│ ┌─────────────────┐                                  │
│ │    Card3        │                                  │
│ └─────────────────┘                                  │
├──────────────────────────────────────────────────────┤
│ FOOTER: Copyright | Links                            │
└──────────────────────────────────────────────────────┘

MOBILE (< 768px)
┌──────────────────────────────────────────────────────┐
│ NAVBAR: Logo Ham Menu | Sign In                      │
├──────────────────────────────────────────────────────┤
│     Centered, Full Width                             │
│ - Heading (smaller font)                             │
│ - Description (adjusted)                             │
│ - Search Bar (full width)                            │
│ - Hero Image (hidden)                                │
├──────────────────────────────────────────────────────┤
│ Role Cards (1 column)                                │
│ ┌─────────────────┐                                  │
│ │    Card1        │                                  │
│ └─────────────────┘                                  │
│ ┌─────────────────┐                                  │
│ │    Card2        │                                  │
│ └─────────────────┘                                  │
│ ┌─────────────────┐                                  │
│ │    Card3        │                                  │
│ └─────────────────┘                                  │
├──────────────────────────────────────────────────────┤
│ FOOTER: Copyright                                    │
│ Links (stacked)                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🎨 Color & Design System

```
┌──────────────────────────────────────────────────────┐
│          SENTINELIQ COLOR PALETTE                    │
└──────────────────────────────────────────────────────┘

PRIMARY COLORS:
│
├─ #1E3A8A  [██] Dark Blue       (Primary action)
├─ #3B82F6  [██] Medium Blue     (Secondary action)
└─ #60A5FA  [██] Light Blue      (Accents)

NEUTRAL COLORS:
│
├─ #F8FAFC  [██] Light Background (Page bg)
├─ #F1F5F9  [██] Slightly Darker  (Section bg)
├─ #E2E8F0  [██] Light Border      (Borders)
├─ #CBD5E1  [██] Medium Gray       (Disabled)
├─ #94A3B8  [██] Light Gray        (Hints)
├─ #64748B  [██] Dark Gray         (Secondary text)
├─ #475569  [██] Med-Dark Gray     (Primary text)
└─ #0F172A  [██] Almost Black      (Headings)

STATUS COLORS:
│
├─ #10B981  [██] Green     (Success / Low Risk)
├─ #EABB08  [██] Yellow    (Warning / Medium Risk)
├─ #F97316  [██] Orange    (Alert / High Risk)
└─ #DC2626  [██] Red       (Critical / Danger)

USAGE:
│
├─ Buttons: Blue gradient (#1E3A8A → #3B82F6)
├─ Links: Blue hover (#3B82F6)
├─ Borders: Light gray (#E2E8F0)
├─ Backgrounds: Light backgrounds (#F8FAFC)
├─ Text: Dark text (#0F172A, #475569)
├─ Icons: Medium blue (#3B82F6)
└─ Alerts: Status colors (green, yellow, orange, red)
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│       PRODUCTION DEPLOYMENT STRUCTURE                │
└─────────────────────────────────────────────────────┘

DEVELOPMENT:
│
├─ http://localhost:5000/welcome
├─ http://localhost:3000/login
├─ http://localhost:4100/login
└─ http://localhost:4000/login

STAGING:
│
├─ https://staging.sentineliq.com/welcome
├─ https://staging.sentineliq.com/admin
├─ https://staging.sentineliq.com/analyst
└─ https://staging.sentineliq.com/viewer

PRODUCTION:
│
├─ https://sentineliq.com/welcome
├─ https://sentineliq.com/admin
├─ https://sentineliq.com/analyst
└─ https://sentineliq.com/viewer

DOCKER/KUBERNETES:
│
├─ sentineliq-welcome:latest   (Port 5000)
├─ sentineliq-admin:latest     (Port 3000)
├─ sentineliq-analyst:latest   (Port 4100)
├─ sentineliq-viewer:latest    (Port 4000)
└─ sentineliq-api:latest       (Port 8000)

CI/CD PIPELINE:
│
├─ Push to main
│  └─> Run tests
│      └─> Build images
│          └─> Push to registry
│              └─> Deploy to K8s
│                  └─> Smoke tests
│                      └─> Notification
```

---

## 📊 Data Flow Diagram

```
┌────────────────────────────────────────────────────┐
│           COMPLETE DATA FLOW                       │
└────────────────────────────────────────────────────┘

USER INTERACTION:
│
Browser
  │
  ├─ Click button
  │  └─> Trigger React event handler
  │
  └─> Fetch API
      │
      ├─ Set Authorization header (token)
      │
      └─> POST/GET/PUT/DELETE request
          │
          ▼
      BACKEND API
          │
          ├─ Validate token
          ├─ Check permissions
          ├─ Query database
          │
          └─> Return response
              │
              ├─ Status code
              ├─ JSON data
              │
              ▼
          FRONTEND
              │
              ├─ Parse response
              ├─ Update state
              ├─ Re-render component
              │
              └─> Update browser UI
                  │
                  └─> User sees result
```

---

**Visual aids complete!** 🎨

These diagrams help visualize:
- System architecture and service separation
- Authentication and authorization flows
- RBAC enforcement mechanisms
- UI component hierarchy
- Responsive design breakpoints
- Color system and design tokens
- Data flow between frontend and backend
- Deployment strategies

Refer to these diagrams when:
- Onboarding new developers
- Planning new features
- Debugging issues
- Scaling the system
- Documenting architecture
