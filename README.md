# Hohoe Experimental Schools - School Management System

A modern, scalable School Management System designed specifically for **Hohoe Experimental Schools**. Built as a mobile-first Progressive Web App (PWA) with offline capabilities, focusing on analytics, grading, assessment, and classroom management.

## 🚀 Features

- **📊 Analytics Dashboard** - Comprehensive insights and reports
- **📝 Grading & Assessment** - Complete grading system with multiple assessment types
- **👥 Classroom Management** - Student enrollment, promotion, and class management
- **📚 Subject Assignment** - Assign subjects to teachers and classes
- **📱 Mobile-First PWA** - Native mobile app experience
- **🔌 Offline Mode** - Full functionality without internet, syncs when online
- **👤 Role-Based Access** - Admin, Class Teacher, and Subject Teacher roles
- **🇬🇭 Ghanaian Context** - Aligned with Ghanaian government school standards

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Shadcn UI (New York style)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **PWA**: Next.js PWA capabilities

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- **[📋 Project Overview](./docs/PROJECT_OVERVIEW.md)** - Complete project overview and requirements
- **[🎨 Design System](./docs/DESIGN_SYSTEM.md)** - UI/UX guidelines and design specifications
- **[📱 Mobile App Experience](./docs/MOBILE_APP_EXPERIENCE.md)** - Mobile-specific patterns and requirements
- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - System architecture and technical design
- **[📅 Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)** - Development roadmap and phases
- **[🗄️ Database Schema](./docs/DATABASE_SCHEMA.md)** - Database design and structure

**👉 Start here**: [Documentation Index](./docs/README.md)

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 👥 User Roles

### Administrator
- Full system control
- Role and permission management
- Subject assignment
- School-wide analytics

### Class Teacher
- Manage assigned class
- Add/remove students
- Promote students
- Class attendance
- Can also be a Subject Teacher

### Subject Teacher
- Grade assigned subjects
- Create assessments
- Subject-specific analytics
- Can also be a Class Teacher

## 📱 Mobile Experience

The system is designed to feel like a native mobile app:
- Bottom tab navigation (no hamburger menu)
- Touch-optimized interactions
- Offline-first architecture
- Fast, smooth animations
- Installable PWA

## 🏗️ Project Structure

```
hohoe-lms/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (admin)/           # Admin routes
│   └── (teacher)/         # Teacher routes
├── components/             # React components
│   ├── ui/                # Shadcn UI components
│   ├── layout/            # Layout components
│   └── features/          # Feature components
├── lib/                   # Utilities and services
│   ├── stores/            # Zustand stores
│   ├── services/          # Data services
│   └── mock-data/         # Mock data generators
├── types/                 # TypeScript types
└── docs/                  # Documentation
```

## 🗺️ Development Phases

1. **Foundation** (Week 1-2) - Setup, design system, mock data
2. **Core Features** (Week 3-5) - Dashboard, classes, students, grades
3. **Offline & Sync** (Week 6-7) - IndexedDB, service worker, sync
4. **Supabase Integration** (Week 8-10) - Database, auth, real-time
5. **Polish & Testing** (Week 11-12) - Analytics, refinement, deployment

## 🇬🇭 Ghanaian School Context

- **Classes**: Primary 1 (P1) to Primary 6 (P6)
- **Terms**: 3 terms per academic year
- **Assessment Types**: Exercises, Tests, Exams
- **Curriculum**: Ghanaian government curriculum

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

---

**Built with ❤️ for Hohoe Experimental Schools**
