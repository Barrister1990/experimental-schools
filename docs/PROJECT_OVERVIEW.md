# Hohoe E.P Basic A - School Management System

## Project Overview

A modern, scalable School Management System designed specifically for **Hohoe Experimental Schools**. The system focuses on analytics, grading, assessment, classroom management, and subject assignment with a mobile-first Progressive Web App (PWA) approach.

## Core Objectives

1. **Mobile-First PWA**: Native mobile app experience with offline capabilities
2. **Offline-First Architecture**: Data entry works offline, syncs with Supabase when online
3. **Role-Based Access Control**: Admin, Class Teacher, and Subject Teacher roles
4. **Ghanaian School Context**: Classes and structure aligned with Ghanaian government school standards
5. **Modern Analytics**: Comprehensive dashboards for data-driven decision making

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: Shadcn UI (New York style)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Icons**: Lucide React
- **PWA**: Next.js PWA capabilities

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage (for documents/files)

### Development Approach
- **Phase 1**: Mock data implementation
- **Phase 2**: Supabase integration after mock data validation

## Target Users

### 1. Administrator
- Full system control
- Role and permission management
- Subject assignment to teachers
- School-wide analytics and reports
- User management
- System configuration

### 2. Class Teacher
- Manage assigned class
- Add/remove students
- Promote students to next class
- **Manual attendance summary entry** (enter attendance summary per term, not daily marking)
- Student evaluations:
  - **Conduct rating** (Excellent, Very Good, Good, Satisfactory, Needs Improvement)
  - **Interest level** (Very High, High, Moderate, Low, Very Low)
  - **Class teacher rewards** (Merit, Achievement, Participation, Leadership, Improvement)
- **Grading** using standard assessment structure:
  - Project: 40 marks
  - Test 1: 20 marks
  - Test 2: 20 marks
  - Group Work: 20 marks
  - Exam: 100 marks
- Class-level analytics
- Can also be a Subject Teacher

### 3. Subject Teacher
- Grade assigned subjects using **standard assessment structure**:
  - Project: 40 marks
  - Test 1: 20 marks
  - Test 2: 20 marks
  - Group Work: 20 marks
  - Exam: 100 marks
- Assessment creation and management
- Subject-specific analytics
- Student performance tracking
- Can also be a Class Teacher

## Key Features

### Core Modules

1. **Analytics Dashboard**
   - School-wide statistics
   - Class performance metrics
   - Subject-wise analytics
   - Student progress tracking
   - Attendance trends
   - Grade distribution

2. **Grading & Assessment**
   - **Standard Assessment Structure** (used by both Class Teachers and Subject Teachers):
     - Project: 40 marks
     - Test 1: 20 marks
     - Test 2: 20 marks
     - Group Work: 20 marks
     - Exam: 100 marks
     - **Total: 200 marks**
   - Grade entry and management
   - Automatic grade calculation and aggregation
   - Report card generation
   - Grade history tracking

3. **Classroom Management**
   - Class creation and configuration
   - Student enrollment
   - Class promotion workflow
   - Attendance tracking
   - Class schedules

4. **Subject Assignment**
   - Subject-to-teacher mapping
   - Class-to-subject assignment
   - Timetable management
   - Subject-specific resources

5. **User Management**
   - Teacher accounts
   - Student records
   - Role assignment
   - Permission management

## Ghanaian School Context

### Class Structure
- **Primary 1 (P1)** to **Primary 6 (P6)**
- Each class may have multiple streams (e.g., P1A, P1B)
- Standard Ghanaian curriculum subjects

### Academic Terms
- **Term 1**: September - December
- **Term 2**: January - April
- **Term 3**: May - August

### Academic Year Format
- Format: **YYYY/YYYY** (e.g., "2025/2026")
- Represents the academic year spanning two calendar years
- Example: 2025/2026 means the academic year starting in 2025 and ending in 2026

### Assessment Types
- Class exercises
- Mid-term tests
- End-of-term examinations
- Continuous assessment

## Project Phases

### Phase 1: Foundation (Current)
- Project setup and documentation
- Design system implementation
- Mock data structure
- Basic routing and navigation

### Phase 2: Core Features (Mock Data)
- Authentication flow (mock)
- Dashboard implementation
- User management
- Class management
- Subject assignment
- Grading system

### Phase 3: Supabase Integration
- Database schema implementation
- Authentication integration
- Real-time sync
- Offline storage (IndexedDB)
- Sync mechanism

### Phase 4: Advanced Features
- Analytics and reporting
- Advanced grading features
- Document management
- Notifications
- Export capabilities

### Phase 5: Optimization & Testing
- Performance optimization
- PWA optimization
- Offline mode testing
- User acceptance testing
- Deployment

## Extensibility & Future Features

This system is designed to be **extensible and scalable**. The architecture supports adding new features without major refactoring.

### Design Principles for Extensibility

1. **Modular Architecture**: Features are organized in separate modules/components
2. **Service Layer**: Data access is abstracted through service layers (mock → Supabase)
3. **Type Safety**: TypeScript interfaces ensure type safety across new features
4. **State Management**: Zustand stores can be easily extended or new ones added
5. **Route Groups**: Next.js route groups allow easy addition of new feature routes

### Adding New Features

When adding new features:

1. **Update Documentation**: Add feature to this document and relevant sections
2. **Define Types**: Create TypeScript interfaces in `types/` folder
3. **Create Service Methods**: Add methods to service layer (mock and Supabase)
4. **Add State Management**: Create or extend Zustand stores if needed
5. **Build Components**: Create feature components in `components/features/`
6. **Add Routes**: Create routes in appropriate route group
7. **Update Navigation**: Add to mobile bottom nav or desktop sidebar
8. **Database Schema**: If needed, add tables/columns to database schema
9. **Offline Support**: Ensure new features work offline with sync queue

### Potential Future Features

The following features may be added as the project evolves:

- **Parent Portal**: Parent access to student grades and attendance
- **Messaging System**: Communication between teachers, admin, and parents
- **Timetable Management**: Full class schedule and timetable system
- **Library Management**: Book tracking and management
- **Fee Management**: Fee collection and tracking
- **Transport Management**: School bus routes and tracking
- **Hostel Management**: Boarding house management (if applicable)
- **Examination Management**: Advanced exam scheduling and management
- **Report Generation**: Advanced PDF report generation
- **Bulk Operations**: Bulk import/export of data
- **Multi-school Support**: Extend to support multiple schools
- **Mobile Apps**: Native iOS/Android apps (if needed)
- **Biometric Integration**: Attendance via biometric devices
- **SMS Notifications**: SMS alerts for parents/teachers

### Documentation Updates

**This is a living document** - it will be updated as features are added:
- Feature specifications will be added to relevant sections
- Database schema will be extended as needed
- UI/UX patterns will be documented for new features
- Implementation plans will be updated with new phases

## Success Criteria

1. ✅ Mobile-first responsive design
2. ✅ Native mobile app experience
3. ✅ Full offline functionality
4. ✅ Seamless data synchronization
5. ✅ Role-based access control
6. ✅ Ghanaian school context compliance
7. ✅ Modern, clean UI (no excessive gradients)
8. ✅ Fast performance on mobile devices
9. ✅ Extensible architecture for future features

