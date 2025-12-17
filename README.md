# FunZone Owner Frontend

React TypeScript application for venue owners to manage their social hubs, events, and reservations.

## 🚀 Features

- **Venue Management**: Create and manage multiple social hubs/venues
- **Event Management**: Create, update, and track event bookings
- **Reservation Management**: View and manage customer reservations
- **Analytics**: View event statistics, revenue, and booking trends
- **Image Gallery**: Upload and manage venue and event images
- **Multi-language Support**: Persian (Farsi) language support
- **Solar Hijri Calendar**: Support for Persian calendar dates
- **Interactive Maps**: Location management for venues

## 🏗️ Project Structure

```
funzone-frontend-owner/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── utils/              # Utility functions
│   ├── i18n/               # Internationalization
│   └── styles/             # Stylesheets
├── public/                 # Static assets
├── package.json
├── vite.config.ts
└── Dockerfile
```

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **npm** or **yarn**: Latest version
- **Docker** & **Docker Compose**: (optional, for containerized setup)

## 🚀 Quick Start

### Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_DEV_PORT=5173
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

### Docker Setup

```bash
# Build and run
docker build -t funzone-frontend-owner .
docker run -p 80:80 funzone-frontend-owner

# Or use with docker-compose (see funzone-infrastructure repository)
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_DEV_PORT` | Development port | `5173` |

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🛠️ Tech Stack

- **Framework**: React 18.3.1
- **Language**: TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.10
- **Routing**: React Router DOM 6.26.2
- **Calendar**: react-multi-date-picker with Persian calendar support
- **Maps**: Leaflet with react-leaflet
- **Charts**: Recharts for analytics

## 🎨 Key Features Implementation

### Venue Management
- Create and edit venues
- Upload venue images
- Set venue amenities and features
- Location management

### Event Management
- Create events with details
- Set pricing and capacity
- Manage event images
- Track event status

### Analytics Dashboard
- Revenue tracking
- Booking trends
- Event performance metrics
- Customer insights

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

1. **Build production bundle**:
   ```bash
   npm run build
   ```

2. **Deploy `dist/` folder** to your web server (Nginx, Apache, etc.)

3. **Configure environment variables** in your hosting platform

## 📦 Dependencies

See `package.json` for all dependencies.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Your License]

## 🔗 Related Repositories

- [funzone-backend](../funzone-backend) - Django REST API
- [funzone-frontend-customer](../funzone-frontend-customer) - Customer React App
- [funzone-infrastructure](../funzone-infrastructure) - Docker Compose setup

