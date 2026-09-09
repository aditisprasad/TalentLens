# TalentLens Insights

You are a senior product engineer, data engineer, UX designer, and AI engineer.

Build a complete, production-quality web application called:

TALENTLENS

Workforce & Recruitment Intelligence Platform

IMPORTANT:

This must be a REAL, FUNCTIONAL PRODUCT — not a static UI mockup.

Do not use placeholder dashboards, fake buttons, empty charts, or hardcoded analytics where real data can be used.

The application should feel like a premium B2B SaaS product used by HR teams, recruiters, people-analytics teams, and business leaders.

==================================================

1. PRODUCT VISION

==================================================

TalentLens is a workforce and recruitment intelligence platform that converts HR/recruitment data into actionable business insights.

The platform should help organizations answer questions such as:

- How many employees do we currently have?

- Which departments are growing or shrinking?

- Where are we losing employees?

- Which recruitment sources perform best?

- Where are candidates dropping out of the hiring funnel?

- How long does hiring take?

- Which departments have workforce gaps?

- Which employee segments have higher attrition risk?

- What factors are associated with employee turnover?

- How is hiring efficiency changing over time?

- What should HR/business leaders pay attention to right now?

The product should combine:

DATA INGESTION

→ DATA VALIDATION

→ DATA CLEANING

→ ANALYTICS

→ KPI DASHBOARDS

→ WORKFORCE INTELLIGENCE

→ RECRUITMENT INTELLIGENCE

→ ATTRITION ANALYSIS

→ WORKFORCE GAP ANALYSIS

→ AI-GENERATED BUSINESS INSIGHTS

==================================================

2. TARGET USERS

==================================================

Primary users:

1. HR Managers

2. Recruiters

3. People Analytics Teams

4. Workforce Planning Teams

5. Business Managers

6. HR Leadership / Executives

Create role-aware access where appropriate.

Roles:

ADMIN

HR_MANAGER

RECRUITER

ANALYST

EXECUTIVE

Each role should have appropriate permissions.

==================================================

3. CORE DESIGN DIRECTION

==================================================

The product must look PREMIUM, MODERN, PROFESSIONAL and DATA-DRIVEN.

Avoid:

- generic admin dashboard aesthetics

- excessive gradients

- neon colors

- cartoon illustrations

- unnecessary glassmorphism

- huge rounded cards everywhere

- excessive animations

- clutter

- fake 3D elements

Visual inspiration:

Modern enterprise SaaS + premium analytics products.

Design language:

Background:

warm off-white / very light neutral

Primary text:

charcoal / near-black

Secondary text:

muted gray

Accent:

muted olive / sage / sophisticated green

Use color primarily for:

- positive/negative trends

- warnings

- charts

- status indicators

Typography:

Use a clean modern sans-serif such as Inter, Geist, or Manrope.

Use strong typographic hierarchy.

Charts should be clean and editorial rather than overly colorful.

==================================================

4. APPLICATION STRUCTURE

==================================================

Create the following main sections:

1. Landing Page

2. Authentication

3. Dashboard

4. Workforce Analytics

5. Recruitment Intelligence

6. Attrition Intelligence

7. Workforce Gap Analysis

8. Employee Analytics

9. Data Management

10. AI Insights

11. Reports

12. Settings

Desktop-first but fully responsive.

Sidebar navigation on desktop.

Mobile navigation should collapse elegantly.

==================================================

5. LANDING PAGE

==================================================

Create a premium SaaS landing page.

Hero:

TALENTLENS

"Turn workforce data into better decisions."

Supporting text:

"An intelligent workforce and recruitment analytics platform that transforms HR data into actionable business insights."

CTA:

"Explore Dashboard"

"See How It Works"

Sections:

- Workforce intelligence

- Recruitment analytics

- Attrition intelligence

- AI-powered insights

- Data-driven workforce planning

Use subtle animations only.

Do not overdesign the landing page.

==================================================

6. AUTHENTICATION

==================================================

Implement functional authentication.

Pages:

/login

/register

/forgot-password

Support:

- email/password authentication

- session management

- protected routes

- logout

After login, redirect to dashboard.

Use Supabase authentication if available in the environment.

If Supabase is unavailable, create a clean authentication abstraction that can be connected later.

Never expose secrets in frontend code.

==================================================

7. DATABASE

==================================================

Use PostgreSQL.

Create a proper relational schema.

Core tables:

users

organizations

employees

departments

job_openings

candidates

applications

interviews

offers

recruitment_sources

attrition_records

performance_records

employee_satisfaction

workforce_targets

insight_reports

uploaded_datasets

Relationships must be properly defined.

Include:

primary keys

foreign keys

timestamps

indexes

constraints

Use realistic normalized database design.

==================================================

8. EMPLOYEE DATA MODEL

==================================================

Employees should support fields such as:

employee_id

name

department

job_title

location

employment_type

hire_date

tenure

salary

manager

performance_rating

promotion_count

satisfaction_score

workload_score

overtime

manager_changes

attrition_status

exit_date

exit_reason

Do not expose sensitive information unnecessarily.

==================================================

9. RECRUITMENT DATA MODEL

==================================================

Job openings:

job_id

job_title

department

location

opening_date

closing_date

status

target_hires

Candidates:

candidate_id

source

job_id

application_date

screening_status

interview_status

offer_status

joining_status

rejection_reason

Recruitment funnel:

Job Opened

→ Applications

→ Screening

→ Interview

→ Offer

→ Accepted

→ Joined

Calculate conversion rates between stages.

==================================================

10. DASHBOARD

==================================================

Create an executive-level dashboard.

Top KPI cards:

TOTAL EMPLOYEES

OPEN POSITIONS

NEW HIRES

ATTRITION RATE

AVERAGE TIME TO HIRE

OFFER ACCEPTANCE RATE

HIRING COST

WORKFORCE GAP

Each KPI should show:

value

trend

comparison with previous period

small contextual indicator

Example:

ATTRITION RATE

8.4%

↓ 1.2% vs previous quarter

Do not hardcode these values when database data exists.

==================================================

11. DASHBOARD CHARTS

==================================================

Include:

1. Headcount Trend

2. Hiring Trend

3. Attrition Trend

4. Recruitment Funnel

5. Employees by Department

6. Hiring Source Performance

7. Workforce Gap

8. Attrition by Department

Use Recharts or another reliable charting library.

Charts must be interactive.

Allow:

hover tooltips

date filtering

department filtering

location filtering

==================================================

12. GLOBAL FILTER SYSTEM

==================================================

Create reusable global filters.

Filters:

Date Range

Department

Location

Job Role

Employment Type

Recruitment Source

When a filter changes, all relevant dashboard components should update.

Do not reload the entire application unnecessarily.

Persist filters during navigation when practical.

==================================================

13. WORKFORCE ANALYTICS

==================================================

Create a dedicated Workforce Analytics page.

Show:

Headcount

Headcount growth

Department distribution

Location distribution

Tenure distribution

Salary distribution

Performance distribution

Promotion trends

Workload trends

Charts:

Headcount by department

Headcount over time

Tenure distribution

Salary bands

Performance distribution

Promotion trends

Include an executive summary at the top.

Example:

"Engineering represents 34% of total headcount and has grown 12% over the last two quarters."

Generate this dynamically from data.

==================================================

14. RECRUITMENT INTELLIGENCE

==================================================

Create a dedicated Recruitment Intelligence page.

Show:

Open positions

Applications

Screening rate

Interview rate

Offer rate

Acceptance rate

Joining rate

Average time-to-hire

Cost per hire

Recruitment funnel visualization:

Job Opened

Applications

Screening

Interview

Offer

Accepted

Joined

Calculate:

Application → Screening conversion

Screening → Interview conversion

Interview → Offer conversion

Offer → Acceptance conversion

Acceptance → Joining conversion

==================================================

15. SOURCE PERFORMANCE

==================================================

Analyze recruitment sources.

Example sources:

LinkedIn

Employee Referral

Job Portal

Company Website

Campus Hiring

Recruitment Agency

Metrics:

applications

qualified candidates

interviews

offers

hires

conversion rate

average time-to-hire

cost per hire

Create a source-performance comparison.

Identify:

BEST SOURCE

HIGHEST CONVERSION

LOWEST COST

FASTEST HIRING

==================================================

16. ATTRITION INTELLIGENCE

==================================================

Create a dedicated Attrition Intelligence page.

Analyze attrition by:

department

tenure

salary band

performance

workload

satisfaction

overtime

promotion history

manager changes

location

Show:

overall attrition rate

voluntary attrition

involuntary attrition

department attrition

tenure attrition

high-risk segments

Create trend charts.

==================================================

17. ATTRITION RISK

==================================================

Build an ML-based attrition risk model if sufficient historical data exists.

Use Python + Scikit-learn.

Possible models:

Logistic Regression

Random Forest

Gradient Boosting

Features may include:

tenure

salary

satisfaction

performance

overtime

promotion history

workload

manager changes

Output:

Low Risk

Medium Risk

High Risk

IMPORTANT:

Do not claim the model is clinically or scientifically predictive.

Display:

"Model-generated risk indicator based on historical workforce patterns."

Show feature importance.

Explain which factors influenced the model.

==================================================

18. WORKFORCE GAP ANALYSIS

==================================================

Create Workforce Gap Analysis.

Compare:

Current Headcount

Required Headcount

Projected Headcount

Calculate:

Workforce Gap = Required Headcount - Current Headcount

Show departments with:

critical gap

moderate gap

surplus

balanced staffing

Create a visual workforce planning chart.

Example:

Engineering

Current: 82

Required: 100

Gap: 18

==================================================

19. DATA MANAGEMENT

==================================================

Create a Data Management page.

Users should be able to:

Upload CSV

Upload XLSX

Preview data

Validate data

Map columns

Clean data

Import data

Delete datasets

Supported file types:

.csv

.xlsx

.xls

Use:

Pandas

openpyxl

for backend processing where appropriate.

==================================================

20. DATA VALIDATION

==================================================

When uploading a dataset:

1. Detect columns

2. Preview records

3. Detect missing values

4. Detect duplicates

5. Detect invalid dates

6. Detect invalid numeric values

7. Detect inconsistent categories

8. Detect schema mismatches

Show a validation report.

Example:

1,248 rows detected

37 missing values

8 duplicate records

2 invalid dates

Allow the user to review issues before importing.

==================================================

21. COLUMN MAPPING

==================================================

Create a mapping interface.

Example:

Uploaded Column:

"Dept"

Map to:

"Department"

Uploaded Column:

"Joining Date"

Map to:

"Hire Date"

Allow users to confirm mappings.

Remember mappings for future uploads where possible.

==================================================

22. SAMPLE DATA

==================================================

Include a realistic synthetic dataset so the application is immediately usable.

Generate enough data to make analytics meaningful.

At least:

500 employees

1000+ candidate/application records

50+ job openings

Use realistic distributions.

Do NOT use real personal information.

Clearly label the dataset:

"Demo Dataset"

==================================================

23. AI BUSINESS INSIGHTS

==================================================

Create an AI Insights page.

The AI should analyze aggregated metrics and generate concise business insights.

Example:

"Customer Support has the highest attrition rate at 14.2%, approximately 5.1 percentage points above the company average."

"Employee referrals have the highest offer-to-joining conversion among current recruitment sources."

"Engineering has the largest projected workforce gap over the next quarter."

AI should NOT invent statistics.

Only use verified values from the database/analytics layer.

Pass structured metrics to the LLM rather than raw unrestricted database access.

==================================================

24. AI INSIGHT CATEGORIES

==================================================

Generate insights under:

WORKFORCE

RECRUITMENT

ATTRITION

HIRING EFFICIENCY

WORKFORCE GAPS

ANOMALIES

OPPORTUNITIES

Each insight should contain:

Title

Observation

Evidence

Business Impact

Suggested Action

Example:

TITLE:

High Attrition in Sales

OBSERVATION:

Sales attrition is 13.8%, above the company average of 8.4%.

BUSINESS IMPACT:

Higher turnover may increase hiring and onboarding costs.

SUGGESTED ACTION:

Review workload, compensation, satisfaction, and promotion patterns for the affected employee segment.

==================================================

25. AI CHAT ASSISTANT

==================================================

Add a conversational analytics assistant.

Name:

TalentLens AI

Users can ask:

"Which department has the highest attrition?"

"Which recruitment source performs best?"

"Where are our biggest workforce gaps?"

"How has hiring changed this year?"

"Which roles take the longest to hire?"

The assistant should query the analytics backend safely.

Do not allow arbitrary SQL from the frontend.

Use predefined analytics functions/tools.

==================================================

26. REPORTS

==================================================

Create a Reports section.

Allow users to generate:

Workforce Report

Recruitment Report

Attrition Report

Executive Summary

Reports should contain:

KPIs

charts

key findings

AI insights

recommendations

Allow export to PDF/CSV where practical.

==================================================

27. EXPORTS

==================================================

Support:

CSV export

Excel export

For dashboard tables and filtered analytics.

Export should respect currently selected filters.

==================================================

28. API ARCHITECTURE

==================================================

Use:

Frontend:

React + TypeScript

Backend:

Python + FastAPI

Database:

PostgreSQL

Analytics:

Pandas + NumPy

ML:

Scikit-learn

Visualization:

Recharts

AI:

OpenAI API

Authentication:

Supabase Auth or secure equivalent

Create clean API endpoints.

Example:

GET /api/dashboard

GET /api/workforce

GET /api/recruitment

GET /api/attrition

GET /api/workforce-gaps

GET /api/sources

POST /api/datasets/upload

POST /api/datasets/validate

POST /api/datasets/import

GET /api/insights

POST /api/ai/query

Use typed request/response models.

==================================================

29. SECURITY

==================================================

Implement:

authentication

authorization

role-based access

input validation

file validation

API validation

environment variables

secure error handling

Never expose:

API keys

database credentials

service-role keys

in frontend code.

==================================================

30. ERROR HANDLING

==================================================

Create professional error states.

Examples:

No data available

Upload failed

Invalid dataset

Server unavailable

AI unavailable

Unauthorized

Session expired

Do not show raw stack traces to users.

==================================================

31. LOADING STATES

==================================================

Every major data-dependent component should have:

skeleton loaders

loading indicators

empty states

Avoid layout shifts.

==================================================

32. RESPONSIVENESS

==================================================

Desktop:

optimized for 1440px+

Tablet:

responsive grid

Mobile:

stack cards

collapse charts

responsive tables

mobile navigation

Do not allow horizontal scrolling except where genuinely necessary.

==================================================

33. UX DETAILS

==================================================

Add:

tooltips

hover states

clear filters

date range selector

breadcrumbs where useful

search

sortable tables

pagination

confirmation dialogs

toast notifications

Keep interactions fast and intuitive.

==================================================

34. DASHBOARD INFORMATION HIERARCHY

==================================================

Prioritize:

1. What is happening?

2. Why is it happening?

3. Where is it happening?

4. What should we do?

Avoid overwhelming users with raw metrics.

Every page should have a clear hierarchy:

SUMMARY

→ TRENDS

→ BREAKDOWN

→ INSIGHTS

→ ACTIONS

==================================================

35. TABLES

==================================================

Create professional data tables.

Features:

sorting

filtering

pagination

search

column visibility where useful

CSV export

Use meaningful empty states.

==================================================

36. PERFORMANCE

==================================================

Optimize:

database queries

API calls

chart rendering

large datasets

file processing

Use indexes for frequently queried fields.

Avoid unnecessary API calls.

Use caching where appropriate.

==================================================

37. CODE QUALITY

==================================================

Use:

TypeScript types

reusable React components

modular backend architecture

service layers

repository/database abstraction

validation schemas

environment configuration

Avoid giant components.

Keep files logically organized.

Use meaningful naming.

Add comments only where useful.

==================================================

38. PROJECT STRUCTURE

==================================================

Use a clean structure similar to:

frontend/

  components/

  pages/

  layouts/

  hooks/

  services/

  types/

  utils/

backend/

  app/

    api/

    models/

    schemas/

    services/

    analytics/

    ml/

    ai/

    database/

Do not put all logic in a single file.

==================================================

39. DEMO EXPERIENCE

==================================================

The application must work immediately after setup.

When a new user opens the dashboard with demo data:

They should immediately see:

- employee count

- hiring metrics

- attrition metrics

- recruitment funnel

- department breakdown

- workforce gaps

- AI insights

Do not make the dashboard look empty.

==================================================

40. DEPLOYMENT

==================================================

Prepare the project for deployment.

Frontend:

Vercel

Backend:

Render or Railway

Database:

Supabase/PostgreSQL

Use environment variables.

Provide:

.env.example

with variables such as:

DATABASE_URL=

OPENAI_API_KEY=

SUPABASE_URL=

SUPABASE_ANON_KEY=

Never commit secrets.

==================================================

41. TESTING

==================================================

Add basic testing for:

API endpoints

analytics calculations

data validation

recruitment funnel calculations

attrition calculations

workforce gap calculations

At minimum verify:

Attrition Rate

Conversion Rates

Time-to-Hire

Workforce Gap

Headcount Trends

Analytics calculations must be deterministic and reproducible.

==================================================

42. IMPORTANT BUSINESS LOGIC

==================================================

Do not hardcode calculated metrics.

Examples:

Attrition Rate:

employees who exited during period

/

average headcount during period

Time-to-Hire:

joining date - application/opening date

Offer Acceptance Rate:

accepted offers

/

total offers

Hiring Conversion:

joined candidates

/

applications

Workforce Gap:

required headcount

-

current headcount

Use clearly defined formulas.

==================================================

43. DATA QUALITY

==================================================

Analytics should gracefully handle:

null values

duplicate records

missing departments

invalid dates

zero denominators

small datasets

Never allow NaN, Infinity, or undefined values to break charts.

==================================================

44. PRODUCT DIFFERENTIATOR

==================================================

TalentLens should NOT feel like:

"another HR dashboard."

Its differentiator is:

DATA

+

ANALYTICS

+

AI

+

BUSINESS DECISION SUPPORT

The product should continuously connect:

METRIC

→ INSIGHT

→ BUSINESS IMPACT

→ RECOMMENDED ACTION

Example:

Metric:

Attrition = 14.2%

Insight:

Attrition is concentrated among employees with 1–2 years tenure.

Possible contributing patterns:

Lower satisfaction + higher overtime.

Action:

Investigate workload and retention initiatives for this segment.

==================================================

45. VISUAL POLISH

==================================================

Make the application portfolio-quality.

Use:

subtle transitions

clean cards

beautiful charts

strong spacing

excellent typography

professional empty states

consistent iconography

Avoid:

excessive animation

neon gradients

gaming UI

generic templates

unnecessary decorative elements

The final product should look like something a serious SaaS startup could launch.

==================================================

46. FINAL ACCEPTANCE CRITERIA

==================================================

The application is NOT complete unless:

[ ] Landing page works

[ ] Authentication works

[ ] Dashboard works

[ ] Demo data exists

[ ] PostgreSQL database is connected

[ ] Employee data can be stored

[ ] Recruitment data can be stored

[ ] CSV upload works

[ ] XLSX upload works

[ ] Data validation works

[ ] Column mapping works

[ ] Workforce analytics work

[ ] Recruitment analytics work

[ ] Recruitment funnel works

[ ] Source analysis works

[ ] Attrition analytics work

[ ] Workforce gap analysis works

[ ] Charts use real backend data

[ ] Global filters work

[ ] AI insights work

[ ] AI assistant works

[ ] Role-based permissions exist

[ ] CSV/Excel exports work

[ ] Error states exist

[ ] Loading states exist

[ ] Mobile responsiveness works

[ ] Environment variables are configured

[ ] No API keys are exposed

[ ] No major buttons are placeholders

[ ] No fake hardcoded analytics are used where real data is available

[ ] Code is modular and maintainable

==================================================

47. CRITICAL INSTRUCTION

==================================================

Do NOT simply generate a beautiful frontend.

Build the complete product architecture.

If some backend functionality cannot be fully implemented immediately, create the correct architecture, interfaces, schemas, and API contracts so it can be completed without rewriting the frontend.

Do not replace real functionality with fake setTimeout(), static JSON, or hardcoded dashboard values.

Whenever real database data is available, use it.

Whenever analytics can be calculated programmatically, calculate them programmatically.

Use AI only where AI genuinely adds value.

The final result should demonstrate:

Software Engineering

Data Analytics

SQL

Database Design

API Development

Machine Learning

AI/LLM Integration

Business Intelligence

Data Visualization

Product Thinking

Business Problem Solving

==================================================

48. FINAL OUTPUT

==================================================

After implementation:

1. Run the application.

2. Verify every major page.

3. Verify database connectivity.

4. Verify demo data.

5. Verify upload flow.

6. Verify analytics calculations.

7. Verify filters.

8. Verify AI insights.

9. Verify responsive layouts.

10. Fix all runtime errors.

11. Remove placeholder content.

12. Ensure the application feels production-ready.

Do not stop after creating the UI.

Continue until the application is a coherent, functional end-to-end workforce intelligence platform.

BUILD TALENTLENS AS A REAL PRODUCT, NOT A MOCKUP.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/958ce049-0cd9-414d-9786-5d52ed183ee9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
