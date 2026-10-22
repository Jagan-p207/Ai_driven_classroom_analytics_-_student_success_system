# EduPulse AI — Frontend Application Architecture

The **EduPulse AI** client is a responsive, educator-centric single-page web application built with **React 19**, **Vite 8**, and **Recharts**. It provides a calm, accessible academic-analytics interface for early warning student risk detection, cohort visualizations, and case management.

---

## 🏛️ Directory Structure

```
frontend/
├── src/
│   ├── assets/              # Static SVG & branding assets
│   ├── components/          # Presentation & container components
│   │   ├── AlertBanner.jsx                # Early warning urgent student alert queue
│   │   ├── ClassHeatmap.jsx               # Cohort risk matrix with strict tier filtering & tooltips
│   │   ├── CohortAnalyticsSection.jsx     # Degree program, standing & schedule cohort analytics
│   │   ├── ErrorBoundary.jsx              # React exception boundary & recovery UI
│   │   ├── HistoricalAnalyticsSection.jsx # Milestone progression & mobility charts
│   │   ├── IngestionModal.jsx             # Step-by-step CSV ingestion & validation pipeline
│   │   ├── ModelInfoModal.jsx             # ML benchmarks, retrain button, confusion matrix & leakage audit
│   │   ├── Navbar.jsx                     # Institutional header & view navigation
│   │   ├── RiskOverviewCards.jsx          # KPI metric cards with accessible risk indicators
│   │   ├── StudentDetailModal.jsx         # Full student dossier, predicted vs observed grade & SHAP drivers
│   │   └── StudentRiskTable.jsx           # Roster table with cohort filters, predicted grades & sorting
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

The EduPulse AI interface follows a **calm, editorial academic-analytics aesthetic**:

- **Surfaces**: Crisp white panels (`#ffffff`) over a clean, warm off-white canvas (`#f8fafc`).
- **Typography**: Primary slate-900 ink (`#0f172a`) paired with clean Inter and Outfit fonts.
- **Accent**: Restrained sky blue (`#0369a1`) and slate teal (`#0f766e`).
- **Accessible Semantic Risk Tiers**:
  - **High Risk**: Crimson text (`#991b1b`), light red background (`#fef2f2`), red border (`#fecaca`).
  - **Medium Risk**: Amber text (`#92400e`), soft amber background (`#fffbeb`), amber border (`#fde68a`).
  - **Low Risk**: Emerald text (`#065f46`), soft green background (`#ecfdf5`), green border (`#a7f3d0`).
- **Standardized Iconography**: Lucide React icons with consistent 1.75px stroke width and standardized 14–18px sizing.

---

## 🚀 Key Interface Modules

1. **Class Overview Dashboard**:
   - High-risk alert banner with quick intervention assignments.
   - 4 KPI cards tracking student count, high-risk flags, average attendance, and average predicted grade.
   - Interactive 192-tile cohort risk matrix with hover tooltips displaying predicted grades and cohort data.
   - Dedicated **Academic Cohort Breakdown** displaying risk distributions and average grades across Degree Programs (1–4), Year Standings (Freshman–Senior), and Schedule Sections.
   - Longitudinal milestone progression chart tracking score stability across assessments.
2. **Student Risk Registry**:
   - Multi-factor search, risk level filters, and new **Program Cohort** and **Academic Standing** dropdowns.
   - Dedicated **Predicted Final** grade column with actual final grade comparison and sorting.
3. **Student Dossier Modal**:
   - Comprehensive student view displaying continuous predicted grade vs observed grade, prediction confidence, multiclass probability distribution, and local SHAP feature attributions.
4. **Machine Learning Intelligence Modal**:
   - Dual-model production banner with one-click **Retrain Pipeline** button.
   - Data Leakage Audit summary explaining the exclusion of end-of-term exams.
   - Regression Benchmark table ($R^2$, MAE, RMSE) and Classification Benchmark table (Accuracy, Macro F1, Weighted F1).
   - 3x3 holdout confusion matrix and global TreeSHAP feature importances.

---

## 🧪 Development & Build

### Running Locally
```bash
npm run dev
```
Starts the Vite development server at [http://localhost:5173](http://localhost:5173).

### Production Build
```bash
cmd /c npm run build
```
Generates minified production assets in `dist/` with zero linting or compilation errors.
