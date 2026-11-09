![main_logo_light.png](src/assets/images/main_logo_light.png) 

## Overview

[EduConnect](https://www.educonnect.com.ng)  is a modern, progressive web application (PWA) that enables seamless collaboration between educational institutions and families. The platform provides role-based dashboards for administrators, teachers, and parents, facilitating better communication and student performance tracking.

## Key Features

- **Role-Based Dashboards**: Tailored interfaces for admins, teachers, and parents
- **Student Management**: Comprehensive student profile and performance tracking
- **User Management**: Centralized user administration and access control
- **Real-Time Communication**: Direct messaging between stakeholders
- **Performance Analytics**: Detailed performance reports and visualizations
- **School Profile Management**: Institutional settings and configurations
- **Progressive Web App**: Installable application with offline support
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices

## Technologies Used

## Frontend Framework

![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7.9.6-CA4245?logo=react-router&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?logo=vite&logoColor=white)

## UI Components & Styling

![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.16-06B6D4?logo=tailwindcss&logoColor=white)
![Chakra UI](https://img.shields.io/badge/Chakra_UI-3.30.0-319795?logo=chakraui&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-Latest-161618?logo=radixui&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide_React-0.552.0-000000?logo=lucide&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.38.0-0055FF?logo=framer&logoColor=white)

## Forms & Validation

![React Hook Form](https://img.shields.io/badge/React_Hook_Form-7.68.0-EC5990?logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.1.13-3E67B1?logo=zod&logoColor=white)
![Hookform Resolvers](https://img.shields.io/badge/@hookform/resolvers-5.2.2-EC5990?logo=reacthookform&logoColor=white)

## Data & API

![Axios](https://img.shields.io/badge/Axios-1.13.2-5A29E4?logo=axios&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.6.0-FF6384?logo=recharts&logoColor=white)

## Utilities

![React Helmet](https://img.shields.io/badge/React_Helmet-6.1.0-222222?logo=react&logoColor=white)
![Next Themes](https://img.shields.io/badge/next--themes-0.4.6-000000?logo=nextdotjs&logoColor=white)
![React Markdown](https://img.shields.io/badge/React_Markdown-10.1.0-000000?logo=markdown&logoColor=white)
![LottieFiles](https://img.shields.io/badge/LottieFiles-0.17.12-00DDB3?logo=lottiefiles&logoColor=white)

## Development Tools

![ESLint](https://img.shields.io/badge/ESLint-9.36.0-4B32C3?logo=eslint&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_Types-Supported-3178C6?logo=typescript&logoColor=white)

## Project Structure

```
educonnect-application/
├── src/
│   ├── components/              # Reusable React components
│   │   ├── auth/               # Authentication-related components
│   │   ├── pwa/                # Progressive Web App components
│   │   ├── ui/                 # UI component library
│   │   ├── Header.jsx          # Application header
│   │   ├── Footer.jsx          # Application footer
│   │   └── ProtectedRoute.jsx  # Route protection wrapper
│   ├── pages/                  # Page components
│   │   ├── auth/               # Authentication pages (login, registration)
│   │   └── application/        # Dashboard and application pages
│   │       ├── AdminDashboard/
│   │       ├── ParentDashboard/
│   │       └── TeacherDashboard/
│   ├── contexts/               # React Context for state management
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── PWAContext.jsx      # PWA state and logic
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Utility functions
│   │   ├── axiosConfig.js      # Axios configuration
│   │   ├── functions.js        # Helper functions
│   │   └── theme.js            # Theme configuration
│   ├── assets/                 # Static assets
│   │   ├── icons/              # Application icons
│   │   └── images/             # Images and backgrounds
│   ├── App.jsx                 # Root application component
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles
├── public/                     # Static files
│   ├── icons/                  # PWA app icons
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── _redirects              # Vercel redirect rules
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint configuration
├── jsconfig.json               # JavaScript configuration
├── components.json             # Component registry
└── vercel.json                 # Vercel deployment configuration
```
 
## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd educonnect-application
```

2. Install dependencies:
```bash
npm install
```
 
## Running the Application

### Development Server
Start the development server with hot module replacement:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Production Build
Build the application for production:
```bash
npm run build
```

### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

### Linting
Check code quality and consistency:
```bash
npm run lint
```

## Deployment

The application is configured for deployment on **Vercel**. 

### Deploying to Vercel
1. Push your code to a connected Git repository
2. Import the repository in Vercel Dashboard
3. Vercel will automatically build and deploy on each push to the main branch

Configuration is managed through `vercel.json` and `vite.config.js`.

## PWA Features

EduConnect is built as a Progressive Web App and supports:
- **Installation**: Install directly on home screen (iOS and Android)
- **Offline Support**: Service Worker enables offline functionality
- **Push Notifications**: Real-time notification support
- **Responsive Design**: Optimized for all device sizes

See `public/manifest.json` for PWA configuration.

## Architecture

### State Management
- **Authentication**: Handled by `AuthContext` for user login, permissions, and session management
- **PWA State**: Managed by `PWAContext` for install prompts and update notifications

### Protected Routes
Routes are protected through the `ProtectedRoute` component, which validates user authentication and role-based access.

### API Integration
API requests are configured through `axiosConfig.js` with automatic interceptors for handling authentication and error scenarios.

## Contributing

EduConnect is a proprietary software project. Contributions are welcome from authorized team members only.

### For Team Members

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Code Standards**:
   - Follow the existing code structure and naming conventions
   - Use ESLint: `npm run lint`
   - Write clean, maintainable code with clear comments
   - Follow React best practices and hooks guidelines

3. **Commit Guidelines**:
   - Use clear, descriptive commit messages
   - Reference related issues when applicable
   - Example: `git commit -m "feat: add user management dashboard"`

4. **Pull Request Process**:
   - Ensure code passes linting: `npm run lint`
   - Test thoroughly on multiple devices
   - Provide clear description of changes
   - Wait for code review before merging

5. **Code Review**:
   - All pull requests require review from project leads
   - Address feedback and suggestions promptly
   - Keep discussions professional and constructive

## Support

For issues, questions, or support requests:
- Contact the development team through internal channels
- Check existing documentation and guides
- Reference the project wiki for detailed information

## License

This project is licensed under a Proprietary License. See [LICENSE](LICENSE.md) for details.

© 2026 EduConnect. All rights reserved.

## Changelog

See `newFeatures.md` for recent updates and new features.

---

**Last Updated**: April 2026

