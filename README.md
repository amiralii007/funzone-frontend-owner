# FunZone Owner App

A modern React TypeScript application for venue owners to manage their business, venues, events, and wallet.

## Features

- **Owner Authentication**: Phone number-based login with verification code
- **Dashboard**: Overview of business metrics and quick actions
- **Venue Management**: Create, edit, and manage venues
- **Event Management**: Create, edit, and manage events
- **Wallet System**: Deposit, withdraw, and track transactions
- **Analytics**: Business performance metrics and insights
- **Profile Management**: Edit owner profile and settings
- **Internationalization**: Support for English and Persian (RTL)
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd "FunZone Owner App"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Language, Auth)
├── i18n/              # Internationalization
│   ├── translations/  # Translation files (en.json, fa.json)
│   └── index.ts       # i18n configuration
├── pages/             # Page components
│   ├── DashboardPage.tsx
│   ├── VenuesPage.tsx
│   ├── EventsPage.tsx
│   ├── WalletPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── ProfilePage.tsx
│   └── LoginPage.tsx
├── state/             # State management
│   └── authStore.tsx  # Authentication store
├── types/             # TypeScript type definitions
│   └── owner.ts       # Owner, Venue, Event types
├── ui/                # Layout components
│   └── AppLayout.tsx  # Main layout with navigation
├── App.tsx            # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles with Tailwind
```

## Features Overview

### Authentication
- Phone number verification
- Mock authentication system
- Persistent login state

### Dashboard
- Business overview with key metrics
- Quick action buttons
- Recent activity summary

### Venue Management
- List all venues with status
- Add new venues with form
- Edit venue information
- View venue performance metrics

### Event Management
- List all events with status
- Add new events with form
- Edit event information
- View event performance metrics

### Wallet System
- View current balance
- Deposit money
- Withdraw money
- Transaction history

### Analytics
- Revenue metrics (total, monthly, weekly, daily)
- Performance metrics
- Top performing venues and events
- Business recommendations

### Profile Management
- View and edit profile information
- Business statistics
- Settings and preferences
- Logout functionality

## Internationalization

The app supports multiple languages:
- English (en)
- Persian/Farsi (fa) with RTL support

Language can be switched using the language switcher in the header.

## Styling

The app uses Tailwind CSS with custom components:
- Glass morphism effects
- Gradient backgrounds
- Responsive design
- Dark theme
- Custom animations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Adding New Features

1. Create new page components in `src/pages/`
2. Add routes in `src/main.tsx`
3. Update navigation in `src/ui/AppLayout.tsx`
4. Add translations in `src/i18n/translations/`
5. Update types in `src/types/owner.ts` if needed

## Mock Data

The app currently uses mock data for demonstration. In a real application, you would:
- Connect to a backend API
- Implement real authentication
- Add data persistence
- Include real payment processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the FunZone ecosystem for venue and event management.

