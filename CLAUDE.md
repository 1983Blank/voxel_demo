# Voxel - AI Prototyping Tool

## Overview

Voxel is a desktop-first AI prototyping tool for product teams. It enables teams to capture web UIs, extract components, generate prototypes using AI, and collaborate on designs.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design (antd) - desktop-first
- **Routing**: React Router v6
- **State Management**: Zustand
- **Server State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/          # Reusable UI components
├── layouts/             # Layout components
│   ├── AppLayout.tsx    # Main app layout with sidebar
│   └── AuthLayout.tsx   # Login/signup layout
├── pages/               # Page components (route-level)
│   ├── Screens.tsx      # Browse/manage captured HTML screens
│   ├── Components.tsx   # View extracted components
│   ├── Editor.tsx       # WYSIWYG + AI prompt editor
│   ├── Variants.tsx     # A/B/C/D variant comparison
│   ├── Context.tsx      # Product context upload
│   └── Analytics.tsx    # Engagement dashboard
├── services/            # API services
├── types/               # TypeScript types
│   └── models.ts        # Domain models (CapturedScreen, Variant, etc.)
├── store/               # Zustand stores
│   ├── authStore.ts     # Authentication state
│   └── screensStore.ts  # Captured screens state
├── hooks/               # Custom React hooks
├── utils/               # Helper functions
└── mock-captures/       # Captured HTML files from SingleFile
    └── screens/         # HTML screen captures
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/screens` | Screens | Browse/manage captured HTML screens |
| `/components` | Components | View extracted components library |
| `/editor/:screenId` | Editor | WYSIWYG + AI prompt editor |
| `/variants/:screenId` | Variants | Compare A/B/C/D variants |
| `/context` | Context | Upload product context (text/PDF/video) |
| `/analytics` | Analytics | Track engagement and feedback |

## MVP Features

1. **Screens Page** - Browse/manage captured HTML screens with thumbnails
2. **Component Library** - View extracted components from screens
3. **Vibe Prototype** - AI prompt + WYSIWYG editor to modify screens
4. **Multi-Variant Output** - Create and compare A/B/C/D variants
5. **Product Context** - Upload text/PDF/video as context for AI
6. **Multiplayer & Commenting** - Collaborate on published prototypes
7. **Analytics Dashboard** - Track variant engagement

## Coding Conventions

### TypeScript
- Use strict mode
- Define types in `src/types/` for reusability
- Prefer interfaces for object types

### Components
- Use function components with TypeScript
- Export as named exports
- Use Ant Design components as foundation

### Styling
- **Desktop-first** application (NOT mobile-first)
- Use Ant Design's built-in styling
- Use inline styles or style props
- Theme customization via ConfigProvider

### State Management
- **Local state**: `useState` for component-specific state
- **Global state**: Zustand stores in `src/store/`
- **Server state**: TanStack Query for API data

## Import Aliases

```typescript
import { Button } from '@/components/ui';
import { useScreensStore } from '@/store/screensStore';
import type { CapturedScreen } from '@/types';
```

## Running the Project

```bash
npm run dev     # Start dev server (port 3000)
npm run build   # Build for production
npm run lint    # Run ESLint
```

## Mock Data

Captured screens are stored in `src/mock-captures/screens/` as HTML files from the SingleFile browser extension. The screensStore loads these as mock data.
