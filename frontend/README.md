# EduPulse AI — Frontend Application Architecture

The **EduPulse AI** client is a responsive, educator-centric single-page web application built with **React 19**, **Vite 8**, and **Recharts**. It provides a calm, accessible academic-analytics interface for early warning student risk detection, cohort visualizations, and case management.

---

## 🏛️ Directory Structure

```
frontend/
├── src/
│   ├── assets/              # Static SVG & branding assets
│   ├── components/          # Reusable presentation & container components
│   │   ├── AlertBanner.jsx                # Early warning urgent student alert queue
│   │   ├── ClassHeatmap.jsx               # Cohort risk matrix with strict tier filtering
│   │   ├── ErrorBoundary.jsx              # React exception boundary & recovery UI
│   │   ├── HistoricalAnalyticsSection.jsx # Milestone progression & mobility charts
│   │   ├── IngestionModal.jsx             # Step-by-step CSV ingestion & validation pipeline
│   │   ├── ModelInfoModal.jsx             # ML model evaluation benchmarks & confusion matrix
│   │   ├── Navbar.jsx                     # Institutional header & view navigation
│   │   ├── RiskOverviewCards.jsx          # KPI metric cards with accessible risk indicators
│   │   ├── StudentDetailModal.jsx         # Full student dossier, SHAP attribution & interventions
│   │   └── StudentRiskTable.jsx           # Roster table with search, sorting, filtering & pagination
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API client layer with live/demo fallback
│   │   ├── api.js           # REST endpoint client for all backend resources
│   │   └── demoData.js      # Complete synthetic fallback dataset for standalone deployments
│   ├── styles/              # Design tokens and global CSS
│   │   └── design-tokens.css# Academic color palette, typography, and semantic risk tokens
│   ├── utils/               # Formatting, badge styling, and numeric utilities
│   │   └── formatters.js
│   ├── App.jsx              # Main application container and view switcher
│   ├── index.css            # Base styles and accessible component utilities
│   └── main.jsx             # Application root mount and error boundary wrapper
├── tests/
│   └── test_components.mjs  # Unit regression tests for data normalization and filter logic
├── public/                  # Public assets served as-is
├── Dockerfile               # Multi-stage production container build (Nginx)
├── nginx.conf               # Production Nginx reverse proxy configuration
├── package.json             # NPM dependencies and scripts
├── vite.config.js           # Vite development and build settings
└── README.md                # Frontend documentation
```

---

## 🎨 Visual Identity & Design System

The EduPulse AI interface was redesigned from the ground up to eliminate AI-generated visual patterns (neon glow cards, rainbow gradients, and floating decorative shadows). It follows a **calm, editorial academic-analytics aesthetic**:

- **Surfaces**: Crisp white panels (`#ffffff`) over a clean, warm off-white canvas (`#f8fafc`).
- **Typography**: Primary slate-900 ink (`#0f172a`) paired with clean Inter and Outfit fonts.
- **Accent**: Restrained sky blue (`#0369a1`) and slate teal (`#0f766e`).
- **Accessible Semantic Risk Tiers**:
  - **High Risk**: Crimson text (`#991b1b`), light red background (`#fef2f2`), red border (`#fecaca`).
  - **Medium Risk**: Amber text (`#92400e`), soft amber background (`#fffbeb`), amber border (`#fde68a`).
  - **Low Risk**: Emerald text (`#065f46`), soft green background (`#ecfdf5`), green border (`#a7f3d0`).
- **Standardized Iconography**: Lucide React icons with consistent 1.75px stroke width and standardized 14–18px sizing.

---

## 🚀 Development & Build

### Running Locally
```bash
npm run dev
```
Starts the Vite development server at [http://localhost:5173](http://localhost:5173).

### Running Tests
```bash
npm test
```
Executes frontend component normalization and cohort heatmap filter regression tests.

### Production Build
```bash
npm run build
```
Generates minified production assets in `dist/`.
