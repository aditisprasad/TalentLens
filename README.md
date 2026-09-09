# 🔎 TalentLens

### 🚀 Workforce & Recruitment Intelligence Platform

> **Turn organizational workforce data into actionable intelligence.**

TalentLens is a data-driven **Workforce & Recruitment Intelligence Platform** designed to help organizations understand workforce health, recruitment performance, employee attrition, and workforce planning through real organizational data.

Instead of relying on hardcoded or pre-populated business data, TalentLens follows an **upload-first architecture** — users upload CSV/XLSX datasets, the platform validates and maps the data, persists it into PostgreSQL, and generates analytics and insights directly from the stored records.

---

## 🌟 What is TalentLens?

HR teams often work with workforce and recruitment information spread across spreadsheets, HR systems, and reports.

TalentLens brings these workflows together into one platform so organizations can answer questions such as:

- 👥 How large is our current workforce?
- 📊 How is our workforce distributed across departments and locations?
- 🎯 How is our recruitment funnel performing?
- 🔎 Which recruitment sources perform best?
- 📉 What patterns exist in employee attrition?
- 🧩 Where are workforce gaps emerging?
- 📈 How is workforce composition changing over time?
- 🤖 What actionable insights can be derived from our organizational data?

## ✅ Implemented today

This repository implements a real upload-first workforce analytics product backed by PostgreSQL and organized around tenant-aware data access.

Implemented features include:

- PostgreSQL-backed persistence and organization-scoped data access
- CSV/XLSX ingestion with validation, mapping, and preview flow
- Atomic dataset import with schema-level checks and reference validation
- Workforce analytics, recruitment funnel metrics, and attrition intelligence
- Workforce gap analysis driven by uploaded targets and current staffing
- Data quality validation for duplicates, invalid values, missing fields, and unresolved references
- Honest empty/insufficient-data states instead of synthetic metrics
- Explainable attrition-risk scoring when enough historical employee data exists
- Transactional import deletion with organization authorization and dependent-record handling
- Authenticated and organization-aware application architecture with RLS and RBAC expectations preserved at the application layer

## 🔮 Future Enhancements

The project is intentionally conservative about unsupported claims. Future enhancements may include:

- deeper production-quality operational reporting
- additional automation around recurring imports
- broader advanced forecasting and model monitoring
- expanded workflow tooling beyond the current analytics-first scope

---

# ✨ Core Features

## 📊 Executive Workforce Dashboard

A centralized view of workforce and recruitment performance.

### Includes:

- 👥 Employee headcount
- 💼 Open positions
- 📈 Workforce trends
- 🎯 Recruitment activity
- 🏢 Department distribution
- 📍 Location distribution
- 👔 Employment type analysis
- 🔎 Workforce indicators
- ⚡ Interactive filtering

> Dashboard metrics are calculated from persisted organizational records rather than hardcoded values.

---

## 👥 Workforce Intelligence

Analyze the organization's employee population using uploaded workforce datasets.

### Capabilities:

- 👥 Headcount analysis
- 🏢 Department distribution
- 💼 Job-role analysis
- 📍 Location analysis
- 👔 Employment-type analysis
- 🔎 Employee records
- 📈 Workforce trends
- 🧩 Workforce planning support

---

## 🎯 Recruitment Intelligence

Analyze recruitment performance across the hiring funnel.

### Recruitment Funnel

```text
💼 Job Opened
      ↓
📥 Applications
      ↓
🔍 Screening
      ↓
🎤 Interview
      ↓
📨 Offer
      ↓
✅ Accepted
      ↓
👤 Joined
````

### Recruitment Analytics

* 📥 Applications
* 👤 Candidates
* 🎤 Interviews
* 📨 Offers
* ✅ Accepted offers
* 👥 Joined candidates
* 🔄 Funnel conversion
* 📊 Recruitment-source performance
* ⏱️ Time-to-hire analysis
* 🎯 Hiring pipeline performance

---

## 📉 Attrition Intelligence

Understand employee exits and retention patterns using historical organizational data.

### Analytics can include:

* 🚪 Employee exits
* 📈 Exit trends
* 📝 Exit reasons
* 🏢 Department-level patterns
* 🔎 Retention indicators
* 📊 Historical attrition analysis

> ⚠️ TalentLens does not fabricate an attrition rate when sufficient historical data is unavailable.

---

## 🧩 Workforce Gap Analysis

Compare the organization's current workforce against workforce targets.

### Identify:

* ⚠️ Staffing shortages
* 🏢 Department-level gaps
* 💼 Role-level gaps
* 🎯 Workforce targets
* 👥 Hiring requirements
* 📋 Planning priorities

---

# 📥 Data Management & Ingestion

TalentLens includes a complete **CSV/XLSX data ingestion workflow**.

### Supported formats

📄 CSV
📊 XLSX

### Import Pipeline

```text
📤 Upload File
      ↓
🔍 File Parsing
      ↓
🧠 Dataset Detection
      ↓
🔗 Column Mapping
      ↓
🧪 Data Validation
      ↓
👀 Preview & Error Review
      ↓
✅ Import Confirmation
      ↓
🗄️ PostgreSQL Persistence
      ↓
📊 Analytics
      ↓
🤖 AI / ML Insights
```

### Validation includes:

* 🔍 Header detection
* 🧠 Dataset classification
* 🔗 Column mapping
* 🔢 Data-type inference
* 🧪 Record validation
* ⚠️ Warning detection
* 🚫 Blocking-error detection
* 👀 Import preview
* 💾 PostgreSQL persistence

---

# 🧪 Data Quality Scorecard

Before data becomes part of the analytics layer, TalentLens evaluates its quality.

### Tracks:

| Metric             | Description                              |
| ------------------ | ---------------------------------------- |
| 📄 Total Records   | Records detected in the uploaded dataset |
| ✅ Valid Records    | Records that pass validation             |
| ❌ Invalid Records  | Records that fail validation             |
| ⚠️ Warnings        | Non-blocking data quality issues         |
| 🚫 Blocking Errors | Issues preventing successful import      |
| 🔗 Column Mapping  | Source-to-system field mapping           |
| 📊 Data Types      | Inferred and validated field types       |
| 📥 Import Status   | Current import state                     |

---

# 🕒 Import History

TalentLens maintains persistent import history so organizations can track their datasets.

### Import records can include:

* 📄 File name
* 📁 File type
* 🗂️ Dataset type
* 🕐 Import timestamp
* 👤 User
* 🏢 Organization
* 📊 Total rows
* ✅ Valid rows
* ❌ Invalid rows
* 💾 Imported rows
* 📌 Import status
* ⚠️ Validation errors

Import history is persisted in PostgreSQL rather than being treated as temporary frontend state.

### Safe dataset deletion

Import History includes a confirmation-gated delete action backed by the PostgreSQL
`delete_workspace_dataset` function. New imports register the employee, job, candidate,
and workforce-target records they touched in `dataset_record_links`. Deletion resolves the
current authenticated organization on the server, verifies ownership or an authorized
management role, removes only exclusively linked records in dependency order, and deletes
the import-history row in the same transaction.

Upserts are intentionally shared: if a later import updates a record that an earlier import
also references, deleting the later import does not remove that shared record. Existing
imports created before lineage tracking have no fabricated ownership links and therefore
can only be removed from history until they are re-imported with lineage metadata. This is
the conservative behavior required to avoid deleting unrelated or historically shared data.

Deleting the final linked import leaves PostgreSQL with zero business records for that
organization. The application then reads its normal empty state; it never seeds or restores
synthetic/demo business data.

---

# 🤖 AI-Powered Insights

TalentLens includes an AI insights layer built on top of organizational analytics.

The AI layer can help interpret:

* 👥 Workforce patterns
* 🎯 Recruitment performance
* 📉 Attrition trends
* 🧩 Workforce gaps
* 📈 Business trends
* 💡 Management recommendations

### 🔐 Grounded Intelligence

AI insights are designed to use the organization's available database information.

If the underlying data is insufficient, TalentLens should clearly communicate that instead of generating fabricated business conclusions.

---

# 🧠 Machine Learning

The architecture supports ML-driven workforce analysis when sufficient historical organizational data exists.

Potential applications include:

* 📉 Attrition analysis
* 📈 Workforce trend analysis
* 🔮 Workforce forecasting
* 🧩 Workforce gap prediction
* 🎯 Recruitment analytics
* 🔎 Pattern detection

ML features are designed to operate on persisted organizational data.

---

# 🏗️ System Architecture

```text
                 ┌─────────────────────┐
                 │    📄 CSV / XLSX    │
                 │ Organizational Data │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ 📥 Data Ingestion   │
                 │    & Validation     │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ 🔗 Column Mapping   │
                 │ 🧪 Schema Validation│
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   🗄️ PostgreSQL     │
                 │  Source of Truth    │
                 └──────────┬──────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        👥 Workforce    🎯 Recruitment   📉 Attrition
          Analytics        Analytics       Analytics
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ 📊 Analytics Engine │
                 └──────────┬──────────┘
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
             📈 Dashboards      🤖 AI / ML
                                  Insights
```

---

# 🗄️ Database Architecture

TalentLens uses **PostgreSQL as the primary persistence layer**.

The data model is organized around workforce, recruitment, organizational, and analytics entities.

```text
🏢 organizations
        │
        ├── 👥 organization_members
        │
        ├── 👤 employees
        │
        ├── 💼 job_openings
        │
        ├── 🧑‍💼 candidates
        │
        ├── 📋 applications
        │
        ├── 🎤 interviews
        │
        ├── 📨 offers
        │
        ├── 🎯 recruitment_sources
        │
        ├── 🚪 attrition_records
        │
        ├── 📈 performance_records
        │
        ├── 😊 employee_satisfaction
        │
        ├── 🎯 workforce_targets
        │
        ├── 📥 uploaded_datasets
        │
        ├── 🔗 column_mappings
        │
        └── 💡 insight_reports
```

---

# 🔐 Multi-Tenant Architecture

TalentLens is designed around organization-level data isolation.

### Security model

* 🔐 Authentication
* 👥 Organization membership
* 🏢 Organization-scoped records
* 🛡️ Role-based access control
* 🔒 PostgreSQL Row Level Security
* 🔎 Organization-aware queries
* 🚫 Cross-organization data isolation

Each organization's business data is associated with its organization context.

---

# 👤 Role-Based Access

TalentLens supports role-oriented access for different organizational users.

| Role               | Responsibility                         |
| ------------------ | -------------------------------------- |
| 👑 `ADMIN`         | Organization & platform administration |
| 👩‍💼 `HR_MANAGER` | Workforce and HR management            |
| 🎯 `RECRUITER`     | Recruitment & candidate workflows      |
| 📊 `ANALYST`       | Workforce & business analytics         |
| 🧑‍💼 `EXECUTIVE`  | Executive insights & reporting         |

---

# 🛡️ Security

Security is treated as a core part of the platform architecture.

### Implemented design principles

* 🔐 Authenticated access
* 🏢 Organization-level isolation
* 🔒 Row Level Security
* 👤 Role-based authorization
* 🗄️ Protected database operations
* 🛡️ Server-side privileged operations
* 🔑 Environment-based configuration
* 🚫 No service-role credentials in frontend code
* 🚫 No secrets committed to GitHub

Sensitive credentials should always remain in environment variables.

---

# 💾 Persistence & State Management

TalentLens treats PostgreSQL as the **source of truth for business data**.

Business data should not depend on:

```text
❌ localStorage
❌ sessionStorage
❌ IndexedDB
```

for permanent storage.

Frontend state is used for UI interactions and temporary workflows, while organizational records and import history are persisted in PostgreSQL.

This allows imported data to survive:

```text
🔄 Page Refresh
      ↓
🧭 Navigation
      ↓
🔐 Logout / Login
      ↓
💻 Application Restart
```

---

# 📊 Data-Driven Design

A key design principle of TalentLens is:

```text
📥 Data
   ↓
🗄️ Persistence
   ↓
⚙️ Business Logic
   ↓
📊 Analytics
   ↓
🤖 Intelligence
   ↓
💡 Actionable Insights
```

### No hardcoded business metrics

Dashboard values should originate from PostgreSQL queries and analytics calculations.

### No fake business data

A fresh workspace should not automatically display fabricated employees, candidates, jobs, or workforce metrics.

### Honest empty states

When no data has been uploaded:

```text
👥 Employees → 0
💼 Jobs → 0
🧑‍💼 Candidates → 0
📥 Imports → 0
```

The interface should show an appropriate empty state rather than inventing business numbers.

---

# 🔄 Example End-to-End Workflow

Imagine an HR manager has an employee spreadsheet.

### 1️⃣ Upload

The HR manager uploads a CSV/XLSX file.

### 2️⃣ Detect

TalentLens analyzes the dataset structure.

### 3️⃣ Map

Source columns are mapped to TalentLens fields.

### 4️⃣ Validate

Records are checked for:

* Required fields
* Data types
* Invalid values
* Structural problems

### 5️⃣ Preview

The user reviews:

* ✅ Valid records
* ⚠️ Warnings
* ❌ Blocking errors

### 6️⃣ Import

The user confirms the import.

Valid records are persisted into PostgreSQL.

### 7️⃣ Analyze

The Workforce and Dashboard modules query the persisted records.

### 8️⃣ Generate Insights

Analytics and AI modules operate on the same underlying organizational data.

---

# 📄 Example Dataset

An employee dataset may contain fields such as:

```text
employee_code
full_name
department
job_title
location
employment_type
hire_date
salary
performance_score
```

TalentLens maps the uploaded source columns into the platform's database schema.

Example:

```text
📄 Uploaded File
       │
       ├── employee_code ──────→ employee_code
       ├── full_name ──────────→ full_name
       ├── department ─────────→ department
       ├── job_title ──────────→ job_title
       ├── location ───────────→ location
       ├── hire_date ──────────→ hire_date
       └── performance_score ──→ performance_score
                                  │
                                  ▼
                           🧪 Validation
                                  │
                                  ▼
                           🗄️ PostgreSQL
                                  │
                                  ▼
                           📊 Analytics
```

---

# 🧪 Functional Verification

TalentLens can be validated through an end-to-end upload test.

### Test 1 — Empty Workspace

Start with no business data.

Expected:

```text
👥 Employees = 0
💼 Jobs = 0
🧑‍💼 Candidates = 0
📥 Import History = 0
```

---

### Test 2 — Upload Dataset

Upload a valid employee dataset.

Expected:

```text
📥 Upload
   ↓
🧪 Validation
   ↓
🗄️ PostgreSQL
   ↓
👥 Employees
   ↓
📊 Dashboard
   ↓
📈 Workforce Analytics
```

---

### Test 3 — Persistence

Refresh the application.

Expected:

```text
✅ Database records remain
✅ Dashboard remains synchronized
✅ Workforce page remains synchronized
✅ Employee list remains synchronized
✅ Import history remains available
```

---

### Test 4 — Additional Upload

Upload another valid dataset.

Expected:

```text
Existing Records
       +
New Records
       ↓
Updated PostgreSQL Dataset
       ↓
Updated Analytics
       ↓
Updated Dashboards
```

All modules should read from the same persisted source of truth.

---

# 🛠️ Technology Stack

### 🎨 Frontend

![React](https://img.shields.io/badge/React-2026-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-Build-purple?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Recharts

### 🗄️ Backend & Database

![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)

* Supabase
* PostgreSQL
* PostgreSQL Functions / RPC
* Row Level Security
* Supabase Authentication

### 📊 Data & Intelligence

* CSV Parsing
* XLSX Processing
* Data Validation
* Schema Mapping
* SQL Analytics
* AI-Powered Insights
* ML-ready Analytics Architecture

### 🧰 Development

![Git](https://img.shields.io/badge/Git-Version_Control-F05032?logo=git)
![GitHub](https://img.shields.io/badge/GitHub-Code-black?logo=github)
![VS Code](https://img.shields.io/badge/VS_Code-Development-007ACC?logo=visualstudiocode)

* Git
* GitHub
* VS Code
* Node.js
* npm

---

# 📁 Project Structure

```text
TalentLens/
│
├── 📂 public/
│
├── 📂 src/
│   ├── 📂 routes/
│   │   ├── 📂 _authenticated/
│   │   │   ├── 📄 data.tsx
│   │   │   ├── 📄 dashboard.tsx
│   │   │   ├── 📄 employees.tsx
│   │   │   ├── 📄 workforce.tsx
│   │   │   ├── 📄 recruitment.tsx
│   │   │   ├── 📄 insights.tsx
│   │   │   ├── 📄 reports.tsx
│   │   │   ├── 📄 settings.tsx
│   │   │   └── ...
│   │   │
│   │   ├── 📄 auth.tsx
│   │   └── 📄 index.tsx
│   │
│   ├── 📂 components/
│   ├── 📂 server/
│   ├── 📄 start.ts
│   └── 📄 styles.css
│
├── 📂 supabase/
│   ├── 📂 migrations/
│   └── 📄 config.toml
│
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts
└── 📄 README.md
```

---

# 🚀 Getting Started

## 📋 Prerequisites

Make sure you have:

* 🟢 Node.js
* 📦 npm
* 🔧 Git
* ☁️ A Supabase project

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/aditisprasad/TalentLens.git
```

```bash
cd TalentLens
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Configure Environment Variables

Create a `.env` file based on `.env.example`.

Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> 🔐 Never commit private credentials or service-role keys.

---

## 4️⃣ Configure Supabase

Connect the project to a Supabase database and apply the migrations located in:

```text
supabase/migrations/
```

The database should contain the required TalentLens schema before testing the complete data-ingestion workflow.

---

## 5️⃣ Start the Development Server

```bash
npm run dev
```

The application will be available through the local development URL provided by Vite.

---

# 🗺️ Product Roadmap

### ✅ Current Focus

* 📥 CSV/XLSX ingestion
* 🧪 Data validation
* 🔗 Schema mapping
* 🗄️ PostgreSQL persistence
* 📊 Workforce analytics
* 🎯 Recruitment intelligence
* 📉 Attrition analysis
* 🧩 Workforce gap analysis
* 🔐 Multi-tenant security
* 🕒 Persistent import history

### 🔮 Future Enhancements

* 🔮 Advanced workforce forecasting
* 🧠 Advanced attrition prediction
* 🎯 Recruitment source optimization
* 🤖 AI workforce assistant
* 💬 Natural-language analytics
* 📊 Advanced reporting
* 📤 Report exports
* ⏰ Scheduled reports
* 🔍 Advanced audit logging
* 📈 Model monitoring
* ☁️ Production observability

---

# 🎯 Project Goals

TalentLens demonstrates how **software engineering + data analytics + AI + product thinking** can be applied to a real-world HR technology problem.

The project focuses on:

* 💻 Full-stack development
* 📥 Data ingestion
* 🧪 Data validation
* 🗄️ PostgreSQL database design
* 🔐 Secure multi-tenant architecture
* 📊 Workforce analytics
* 🎯 Recruitment intelligence
* 📉 Attrition analysis
* 🤖 AI-assisted insights
* 🧠 Machine-learning-ready workflows
* 📈 Business dashboards
* 💾 Reliable data persistence
* 🧩 Product-oriented problem solving

---

# 💡 Design Philosophy

TalentLens is not intended to be just another dashboard.

The core objective is to build a system where:

```text
             REAL DATA
                ↓
        RELIABLE INGESTION
                ↓
          VALIDATION
                ↓
          PERSISTENCE
                ↓
        BUSINESS LOGIC
                ↓
           ANALYTICS
                ↓
        AI / ML INSIGHTS
                ↓
       ACTIONABLE DECISIONS
```

### 🌱 From Data → Intelligence → Decisions

The platform is designed to help transform raw organizational data into meaningful workforce intelligence.

---
