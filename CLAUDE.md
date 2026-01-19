# SaaS Webapp - Project Guidelines

## Overview

This is a desktop-first SaaS web application built with React, TypeScript, and Vite. It uses Ant Design as the primary UI component library.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design (antd)
- **Routing**: React Router v6
- **State Management**: Zustand
- **Server State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Ant Design wrappers and custom components
│   ├── DataTable/       # Reusable data table component
│   └── EmptyState/      # Empty state component
├── features/            # Feature-based modules
│   ├── auth/            # Authentication feature
│   ├── users/           # User management
│   └── dashboard/       # Dashboard feature
├── layouts/             # Layout components
│   ├── AppLayout.tsx    # Main app layout with sidebar
│   └── AuthLayout.tsx   # Login/signup layout
├── pages/               # Page components (route-level)
├── services/            # API services
│   ├── api.ts           # Axios instance
│   └── endpoints/       # API endpoint functions
├── types/               # TypeScript types
│   ├── api.ts           # API types
│   └── models.ts        # Domain models
├── hooks/               # Custom React hooks
├── store/               # Zustand stores
└── utils/               # Helper functions
```

## Coding Conventions

### TypeScript

- Use strict mode (enabled in tsconfig)
- Define types in `src/types/` for reusability
- Prefer interfaces for object types, type aliases for unions/intersections
- Use `type` imports when importing only types

### Components

- Use function components with TypeScript
- Export components as named exports
- Keep components focused and single-purpose
- Use Ant Design components as the foundation

### Styling

- This is a **desktop-first** application
- Use Ant Design's built-in styling and theming
- Use inline styles or Ant Design's `style` prop for component-specific styles
- Avoid external CSS files unless necessary
- Theme customization is done in `App.tsx` via ConfigProvider

### State Management

- **Local state**: Use `useState` for component-specific state
- **Global state**: Use Zustand stores in `src/store/`
- **Server state**: Use TanStack Query for API data fetching/caching

### API Calls

- All API calls go through the Axios instance in `src/services/api.ts`
- Group endpoints by feature in `src/services/endpoints/`
- Use TanStack Query hooks for data fetching in components

### Forms

- Use React Hook Form for form handling
- Use Zod for form validation schemas
- Integrate with Ant Design form components via Controller

## Import Aliases

Use the `@/` alias for absolute imports:

```typescript
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
```

## Running the Project

```bash
npm install     # Install dependencies
npm run dev     # Start development server (port 3000)
npm run build   # Build for production
npm run preview # Preview production build
npm run lint    # Run ESLint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_BASE_URL`: Backend API base URL

## Authentication Flow

1. User visits protected route → redirected to `/login`
2. User logs in → token stored in localStorage + Zustand
3. Subsequent requests include Authorization header via Axios interceptor
4. 401 responses trigger logout and redirect to login
