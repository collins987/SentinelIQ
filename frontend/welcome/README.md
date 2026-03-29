# SentinelIQ Welcome Page

Welcome portal for SentinelIQ security platform. This service runs on **http://localhost:5000/welcome**

## Overview

This is a standalone Next.js application that serves as the central entry point for SentinelIQ. Users land on the Welcome Page where they can select their role (Admin, Analyst, or Viewer), which then directs them to their respective login portals.

## Features

- **Pixel-Accurate UI**: Modern, responsive welcome page matching the SentinelIQ design
- **Role Selection**: 3 distinct role options with smooth navigation
- **SentinelIQ Blue Theme**: Professional color scheme throughout
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Hover effects, floating elements, and transitions

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: CSS Modules with custom blue theme
- **Language**: TypeScript
- **Font**: Poppins, Inter

## Getting Started

### Installation

```bash
cd frontend/welcome
npm install
```

### Development

```bash
npm run dev
```

The app will be available at **http://localhost:5000/welcome**

### Build

```bash
npm run build
npm run start
```

## Directory Structure

```
welcome/
├── pages/
│   ├── _app.tsx          # Next.js app wrapper
│   ├── _document.tsx     # HTML document setup
│   ├── index.tsx         # Redirect to /welcome
│   ├── welcome.tsx       # Main Welcome page
│   └── globals.css       # Global styles
├── src/
│   ├── components/
│   │   └── WelcomePage.module.css
│   ├── styles/
│   └── utils/
├── public/
├── package.json
├── tsconfig.json
└── next.config.js
```

## Routes

- **`/`** - Redirects to `/welcome`
- **`/welcome`** - Main welcome page

## Portal Redirects

Users can access:

1. **Admin Portal** → http://localhost:3000/login
2. **Analyst Workspace** → http://localhost:4100
3. **Viewer Dashboard** → http://localhost:4000

## Color Scheme

- **Primary**: #1E3A8A (Dark Blue)
- **Secondary**: #3B82F6 (Medium Blue)
- **Accent**: #60A5FA (Light Blue)
- **Background**: #F8FAFC (Soft Background)

## License

Proprietary - SentinelIQ Platform
