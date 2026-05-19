# 1-to-1 World — Company Portal: Full Product Specification

**Version:** 1.0  
**Date:** May 2026  
**Company:** 1-to-1 World  
**Industry:** Lighting design and supply  
**Staff:** 20 people, 1 developer  

---

## 1. What We Are Building

A single, custom-built company portal that replaces every internal spreadsheet, tracker, and tool currently in use — except the accounting software (Xero or SAGE), which remains the financial source of truth.

The portal has two separate interfaces built on one codebase:

- **Staff portal** — internal, role-gated, where all work happens
- **Client portal** — external, clean, client-facing, showing only their own project data

The portal must be fully navigable, with every module connected. Updates in one place reflect everywhere else in real time.

---

## 2. The Business

1-to-1 World offers two core services:

1. **Lighting design** — space analysis, concept layouts, schematic drawings, final design, site support, commissioning
2. **Product supply** — sourcing and supplying light fittings to match the design specifications

A project can be:
- **Design only** — client wants design services, may source products themselves
- **Design + supply** — full service: design then procurement
- **Supply only** — client already has a design, just needs the fittings

The portal must handle all three project types.

---

## 3. Staff Portal — All Modules

### 3.1 Dashboard
The landing page for all staff. Shows:
- Active projects count
- Outstanding fees total
- Projects awaiting client approval
- Off-track project count
- Active projects table (project name, offering, PM, stage, deadline, status, outstanding amount)
- Today's personal tasks

### 3.2 CRM (Client Relationship Management)
Full client intelligence hub — not just a contact list.

**CRM home dashboard shows:**
- Total clients count
- Lifetime fees billed
- Active leads count
- Lost leads count
- Top clients by revenue (with progress bars and outstanding amounts)
- Active leads table (lead name, estimated value, pipeline status)
- Recent lost leads (with reason logged)

**Individual client profile has five tabs:**
1. **Overview** — contact details, relationship summary, stats (total projects, fees, outstanding)
2. **Projects** — all projects ever linked to this client, clickable to open
3. **Proposals** — all proposals sent (design fee proposals), outcome (approved/lost), notes
4. **Financials** — total billed, received, outstanding, full invoice history
5. **Activity log** — every interaction logged chronologically (calls, emails, proposals sent, payments received, approvals) with timestamp and staff member

**Leads tracking:**
- Active leads with pipeline stage
- Lost leads with reason (price, went elsewhere, budget cut, timing, etc.)
- All leads link to a client record

### 3.3 Sales Pipeline
Kanban board replacing the sales spreadsheet.

**Stages (left to right):**
1. Enquiry
2. Brief received
3. Proposal sent
4. Approved ← when client signs off, "Convert to project" button appears
5. Won (converted projects)
6. Lost (with reason logged)

Each card shows: project name, offering type, estimated/actual value.

### 3.4 Projects (Project List)
Master list of all projects. Filterable by PM, offering type, status, date range.

**Columns:** Project name, Offering, PM, Stage, Deadline, Status (On track / Off track), Design fee, Outstanding amount.

Clicking any row opens the full project detail view.

### 3.5 Design Tracker
The spreadsheet replacement. A live, editable master table showing every project as a row with all tracking columns. Updates made here sync instantly to the project record and vice versa.

**Columns (matching current spreadsheet):**
Project, Offering, SQM, PM, Stage, Status, Delay reason, Design start, Deadline, Days left, Fee excl. VAT, Fee paid, Outstanding, Product approved, Complete/Ongoing, Stage 1, Stage 2, Stage 3, Stage 4, Stage 5

**Key behaviours:**
- Every column is editable inline via dropdowns or inputs
- Changes sync bidirectionally with the project record
- Filterable by PM, offering, status
- Staff can update from the tracker OR from inside the project — both routes work
- A toast notification confirms when a change has synced

### 3.6 Project Detail View
Opened by clicking any project. Has five tabs:

**Tab 1 — Overview**
- Stat cards: current stage, area (m²), next deadline, outstanding amount
- Project details: client (clickable to open CRM profile), offering, SQM, design start, deadline, delay reason
- Fee summary: design fee excl., paid to date, outstanding, hours logged, product approved status
- Update panel (right side): dropdowns to update stage, status, delay reason, complete/ongoing — changes sync to tracker

**Tab 2 — Design stages**
- One card per phase, ordered by template
- Completed phases show approved status, approval date, client note if any
- Current phase shows uploaded deliverables with their review status
- Future phases are locked (greyed out) until current phase is approved
- Upload button per phase
- "Chase client" button on phases awaiting approval
- Phases are defined by the project template — not hard-coded

**Tab 3 — Documents**
Filter tabs: All / Design files / Proposals / Invoices / Other
Each file shows: name, category, phase it belongs to, date, visibility (client-visible or internal only), status badge
Upload button. Toggling client visibility per file.

**Tab 4 — Team & time**
- Team members assigned to this project with their roles and hours logged
- Add member button
- Log time button (manual entry or timer)
- Total hours logged, broken down by person
- Note: time tracking is for internal profitability analysis only — 1-to-1 World does not bill by the hour

**Tab 5 — Financials**
- Stats: total fee, received, outstanding
- Payment schedule table: milestone name, amount, invoice number (if raised), status (queued/paid/overdue)
- Raise invoice button (manual trigger — invoices are never sent automatically)
- Record payment button
- Issue refund button (creates a negative entry in the ledger)

### 3.7 Design Fee Calculator
Standalone tool for generating design fee proposals.

**Inputs:**
- Interior area (m²)
- Landscape area (m²)
- Fee type (Signature / Modus Signature / Modus Projects / Professional / Portfolio — more types to be added)
- Stages to include (toggleable): Concept design, Schematic design, Final design, Site support, Commissioning
- Options: Out of town travel, BIM/Revit uplift (+20%), Signature consult, Discount (%)

**Auto-calculated:**
- Zone breakdown (experiential / secondary / non-experiential splits)
- Per-stage subtotals
- Total design fee excl. VAT
- Estimated product budget (indicative)

**Rate card** (pulled from database, editable by admin in Settings):
- Experiential living: R180/m² concept, R144 schematic, R117 final
- Secondary living: R105/m² concept, R84 schematic, R68.25 final
- Non-experiential: R30/m² concept, R24 schematic, R19.50 final
- Experiential landscape: R140/m² concept, R112 schematic, R91 final
- Secondary landscape: R55/m² concept, R44 schematic, R35.75 final

**Payment schedule builder:**
- Unlimited milestone rows (label + percentage)
- Validation: warns if percentages don't total 100%
- Supports partial payments and refunds

**Output:** "Generate proposal" button creates a formatted PDF proposal ready for review before sending.

### 3.8 Time Tracking
All staff log hours against projects and tasks. For internal profitability tracking only — not billing.

**Each time log entry:**
- Staff member
- Project
- Task description
- Date
- Hours

Manager can view timesheets per staff member per week. Project view shows total hours logged vs revenue to calculate profitability.

### 3.9 Product Catalog
Full database of all light fittings available to quote and specify.

**Per product:**
- Product name, brand, SKU
- Full specifications
- Datasheets and images
- Cost price, trade price, retail price
- Stock level
- Supplier information
- Category and filters

Used by both the quoting/BOQ module and the design studio.

### 3.10 BOQ Maker (Bill of Quantities)
The BOQ is the engine for all product procurement. It can be:
- Started from within a design project (most common)
- Created as a standalone for supply-only projects (no design phase required)

**BOQ builder:**
- Select products from the catalog
- Set quantities per product
- Add area references (which room/zone each fitting goes to)
- Spec notes per line item
- Cost and retail pricing auto-populated from catalog
- Margin visible internally (never shown to client)

**From an approved BOQ, the following can be generated:**
1. **Client quote** — product supply quote at retail pricing for client approval
2. **Purchase order** — sent to supplier at cost pricing
3. **Delivery note** — generated when goods are dispatched
4. **Progress statement** — partial completion billing document
5. **Invoice** — final billing to client

All documents are stored against the order record.

### 3.11 Orders
Purchase order management. Orders can originate from:
1. **Approved BOQ** — product lines auto-imported, linked to project
2. **Standalone** — created manually, can be linked to a project later (unlinked orders flagged in system)

**Order lifecycle:**
Draft → Supplier order placed (ref + expected date logged) → Awaiting delivery → Items received (full or partial) → Complete

**Partial delivery handling:**
- Each line item tracks qty ordered vs qty received
- Remaining qty stays as back-order until fulfilled
- Order stays open until all items received

**Order record contains:**
- Linked project
- Linked BOQ
- Supplier details
- All line items with qty ordered and qty received
- All generated documents (PO, delivery note, invoice)
- Expected delivery date
- Internal notes

### 3.12 Invoices
All invoices across all projects and orders.

**Invoice types:**
- Design fee milestone invoices (linked to project payment schedule)
- Product supply invoices (linked to orders)

**Invoice statuses:** Draft → Sent → Partially paid → Paid → Overdue

**Key rules:**
- Invoices are auto-generated (pre-filled from quote/order data) but NEVER auto-sent
- Staff must manually review and trigger send (via portal, email) or download as PDF
- Payments recorded manually when funds arrive
- Refunds create negative ledger entries
- All invoices export to Xero or SAGE accounting software

### 3.13 Documents
Central file store for the entire company.

**Filter categories:** All / Design files / Proposals / Invoices / Contracts / Other

**Per file:**
- Linked project
- Category
- Stage it belongs to (for design files)
- Upload date
- Version history
- Visibility toggle: internal only or client-visible

**Document types that live here:**
- CAD drawings (.dwg)
- PDFs (layouts, specs, reports)
- Photometric reports
- Fitting schedules
- Proposals
- Invoices
- Contracts and T&Cs
- Internal working documents

### 3.14 HR & People
Full professional HR system built into the portal.

**Staff directory:**
- Full staff profiles: name, role, department, start date, contract type, ID number, manager
- Each staff member linked to a portal user account
- Each staff member's active project assignments and hours visible

**Leave management:**
- Leave types (configurable by admin): Annual, Sick, Family responsibility, Unpaid, Study, Other
- Each type has: days per year entitlement, carry-over maximum, whether supporting documents are required
- Leave balances tracked per employee per type per year (entitlement, taken, remaining)
- Leave request flow: employee submits → manager notified → approve/reject → balance auto-updated → company calendar updated
- Company leave calendar showing who is off when
- Payroll data export (hours and leave data)

### 3.15 Reports & Dashboards
Company-wide KPIs replacing all spreadsheet trackers.

**Available reports:**
- Company KPI dashboard (fees issued YTD, collected, outstanding, active projects)
- Sales pipeline performance (win rate, average deal value, lost reasons)
- Project health overview (on track vs off track, overdue)
- Financial summary (revenue by month, by PM, by offering type)
- Staff utilisation (hours logged per person per month)
- Project profitability (revenue vs hours logged vs product margin)
- Product sales analysis

### 3.16 Support / Helpdesk
- Clients submit tickets from client portal
- Staff raise internal ops tickets
- Tickets are assigned to a staff member
- Status tracking: Open / In progress / Resolved
- Linked to projects
- Email notifications on every status update

### 3.17 Settings (Admin only)
- Roles & permissions builder
- Company details
- Fee rate card (editable rates that feed the design fee calculator)
- Email templates
- Xero / SAGE integration
- Notification preferences
- Data export
- User management
- Project templates (see Section 6)

---

## 4. Client Portal

Completely separate interface — clean, simple, client-focused. Clients only ever see their own data.

**Navigation tabs:**
1. My projects
2. Documents
3. Invoices
4. Messages
5. Support

**My projects:**
- All active projects for this client
- "Action needed" banner if anything requires their attention (quote to approve, design to review)
- Per project: progress bar, current phase, designer name, estimated completion date

**Quote / design approval:**
- Client can review proposal and digitally sign off
- Client can review design deliverables and approve or request revisions
- All revision requests and approvals are logged with timestamp

**Documents:**
- Only files marked as "client-visible" by staff
- Can download files
- Cannot see internal documents

**Invoices:**
- View all their invoices
- See payment status
- Download PDFs

**Messages:**
- Direct messaging with the project team

**Support:**
- Submit a support ticket
- Track status of their tickets

---

## 5. User Roles & Permissions

Roles are fully custom — admin creates any role with any name (e.g. "Senior Designer", "Estimator", "Warehouse", "Sales Rep"). There are no hard-coded roles except Admin/Owner.

**Permission levels per section:**
- **Full access** — create, edit, delete
- **Can edit** — create and edit, no delete
- **View only** — read only, no changes
- **No access** — section is completely hidden from their navigation

Admin sets these per role per section via dropdown in the Roles & Permissions settings screen.

**Data scoping within sections:**
Beyond what sections a role can access, data is also scoped:
- A designer sees only projects they are assigned to
- A sales rep sees only their own leads
- A PM sees all projects in their portfolio
- Admin and managers see everything

**Role permission applies to:**
Dashboard, CRM, Sales pipeline, Design tracker, Projects, Design fee calculator, Time tracking, Products, Orders, Invoices, Documents, HR & people, Reports, Support, Settings

---

## 6. Project Templates

Admin can create multiple project templates for different project types (Design only, Design + supply, Supply only, etc.).

**What a template defines:**
- Template name and type
- Which phases are included (e.g. Concept, Schematic, Final design, Snags)
- Phase order (drag to reorder)
- Whether each phase requires client approval
- Whether completing a phase triggers an invoice
- Custom fields (additional tracker columns beyond the core set)

**Custom fields (flexible approach):**
Core fields (name, client, PM, fee, dates, status) are fixed. Everything else is a custom field defined in the template. Admin can add any field with these types:
- Text
- Number
- Date
- Dropdown (with configurable options)
- Yes/No toggle
- Currency

**When admin adds a new field:**
- It appears as a new column in the design tracker for all projects using that template
- Each project stores its value for that field separately
- The database structure never needs to change — fields are stored as key-value pairs

**Database approach (flexible fields model):**
- `project_templates` — defines the template
- `template_fields` — defines each custom column (name, type, order)
- `template_phases` — defines each phase in order
- `projects` — the project record (links to template)
- `project_field_values` — stores each project's value for each custom field (key-value pairs)
- `project_phases` — tracks each project's progress through its phases

This means adding a new column never requires a database migration — it just adds rows to `template_fields`.

**Existing projects when template changes:**
- New fields added to a template appear on existing projects with an empty value
- Deleted phases: projects currently on that phase must be manually moved before the phase can be removed
- Phase reordering only affects new projects

---

## 7. The Design Fee Flow (End to End)

1. **Enquiry logged** — staff create client and lead record in CRM, lead enters pipeline at "Enquiry" stage
2. **Brief collected** — staff request and record property meterage, space types, and scope
3. **Fee calculated** — staff open design fee calculator, enter m², select fee type and stages, configure payment schedule. System generates a draft proposal PDF. Nothing is sent yet.
4. **Proposal sent** — staff manually send proposal via portal, email, or PDF download. Pipeline moves to "Proposal sent".
5. **Client decision:**
   - Approved → flow continues
   - Revision requested → staff adjust calculator, regenerate, send new version (revision history kept)
   - Declined → pipeline moves to Lost, reason logged
6. **Manual project conversion** — "Convert to project" button appears on approved proposal. Staff assign PM and team, confirm project name and start date, then create project. PM is required before project can be created.
7. **Deposit invoice prepared** — invoice auto-generated from payment schedule (pre-filled, correct amount) but sits as a Draft. Staff manually send or download PDF.
8. **Payment recorded** — staff record payment when funds arrive. Partial payments supported. Project status flips to "Active" when required deposit amount is met.
9. **Design work begins** — project is Active, PM assigned, payment schedule running

---

## 8. The Order / Procurement Flow

**Entry point 1 — From approved BOQ:**
- Client approves design
- Staff build BOQ from product catalog
- BOQ approved internally
- System auto-generates a draft purchase order pre-filled with all product lines
- Service line items (design fees) are excluded — only physical products flow through
- Staff review draft, adjust quantities if needed, confirm supplier
- Order status moves to "Ordered" — supplier ref and expected date logged
- Items received against each line (full or partial)
- Partial: remaining qty stays open as back-order
- Complete: order closed

**Entry point 2 — Standalone order:**
- Staff create order from scratch (supply-only project or ad-hoc)
- Select products from catalog, set quantities
- Link to a project immediately or leave unlinked (unlinked orders flagged in system)
- Same lifecycle from there

**Documents generated per order:**
- Client supply quote (retail pricing, for approval)
- Purchase order to supplier (cost pricing)
- Delivery note (on dispatch)
- Progress statement (partial billing)
- Invoice to client

---

## 9. Database Schema Overview

**Core tables:**

| Table | Purpose |
|-------|---------|
| `project_templates` | Template definitions |
| `template_fields` | Custom column definitions per template |
| `template_phases` | Phase definitions per template, in order |
| `projects` | Project records (links to template, client, PM) |
| `project_field_values` | Key-value store for all custom field values per project |
| `project_phases` | Per-project phase progress tracking |
| `clients` | Client/company records |
| `contacts` | Individual contacts linked to clients |
| `leads` | Sales pipeline leads |
| `proposals` | Design fee proposals |
| `boqs` | Bill of quantities per project |
| `boq_items` | Line items per BOQ (product, qty, pricing) |
| `orders` | Purchase orders |
| `order_items` | Line items per order with received qty tracking |
| `order_documents` | All documents generated per order |
| `invoices` | All invoices |
| `payments` | Payment ledger (positive and negative entries) |
| `products` | Product catalog |
| `suppliers` | Supplier database |
| `employees` | Staff records |
| `leave_types` | Configurable leave types |
| `leave_balances` | Balance per employee per type per year |
| `leave_requests` | Leave requests and approval status |
| `time_logs` | Hours logged per staff per project per task |
| `documents` | File metadata (actual files stored in cloud storage) |
| `roles` | Custom roles defined by admin |
| `role_permissions` | Permission level per role per section |
| `users` | Portal login accounts |

**Key architectural decision — flexible fields:**
Custom project columns are stored as key-value pairs in `project_field_values`, not as database columns. This means admin can add or remove columns from templates without any database migration. Adding a field = adding a row to `template_fields`. Storing a value = adding a row to `project_field_values`.

---

## 10. Recommended Tech Stack

Chosen for a solo developer. One coherent ecosystem, minimal infrastructure overhead.

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend & backend | Next.js 14 (App Router) | Single codebase: React UI + API routes |
| Language | TypeScript | Type safety, fewer runtime bugs |
| Styling | Tailwind CSS | Fast, consistent UI |
| Data fetching | React Query (TanStack) | Caching, sync, optimistic updates |
| Database | Supabase (PostgreSQL) | DB + Auth + Storage + Realtime in one |
| Auth | Supabase Auth | Email/password + 2FA, row-level security |
| File storage | Supabase Storage | CAD, PDFs, images |
| Real-time | Supabase Realtime | Live tracker updates, notifications |
| Hosting | Vercel | 1-click deploy, auto-scaling |
| Email | Resend | Transactional email for all notifications |
| PDF generation | React PDF | Proposals, invoices, delivery notes |
| File uploads | UploadThing | Large CAD and render file uploads |
| Accounting | Xero API (or SAGE) | Invoice export to accounting software |
| Payments (optional) | Stripe | Online invoice payment by clients |

**Domain:** portal.1-to-1.world (or similar)

---

## 11. Suggested Build Order

### Phase 1 — Foundation (weeks 1–6)
- Auth system (login, roles, permissions)
- Staff portal shell (sidebar, navigation)
- CRM (clients, contacts, leads)
- Sales pipeline (kanban board)
- Basic project list

### Phase 2 — Core project flow (weeks 7–14)
- Design fee calculator
- Proposal generation (PDF)
- Project creation from proposal (manual conversion, PM assignment)
- Project detail view (all tabs)
- Design tracker (two-way sync)
- Project templates (basic version)

### Phase 3 — Finance & documents (weeks 15–20)
- Invoice generation and management
- Payment ledger
- Document management with visibility toggling
- Time tracking
- Xero/SAGE export

### Phase 4 — Operations (weeks 21–28)
- Product catalog
- BOQ maker
- Order management
- Order document generation (quote, PO, delivery note, invoice)

### Phase 5 — Client portal (weeks 29–34)
- Client-facing portal (separate interface)
- Project status view for clients
- Quote and design approval flow
- Client document downloads
- Client messaging and support tickets

### Phase 6 — HR & reporting (weeks 35–42)
- Full HR system (staff profiles, leave types, balances)
- Leave request and approval flow
- Leave calendar
- Reports and dashboards
- Admin template builder (full custom fields)

---

## 12. Key Business Rules

- Invoices are auto-generated but NEVER auto-sent. Staff must manually trigger send or PDF download.
- Projects cannot be created without a PM assigned.
- Design tracker and project detail are always in sync — one source of truth, two entry points.
- Clients only ever see data tagged as "client-visible". Internal documents, margins, supplier details, and staff notes are never exposed.
- The accounting software (Xero/SAGE) is the financial source of truth for accounting purposes. The portal tracks invoices and payments for operational visibility only.
- Product catalog pricing has three tiers: cost (what 1-to-1 World pays), trade, and retail (what clients pay). Margins are internal only.
- Partial payments are supported on all invoices. A refund creates a negative entry in the payment ledger.
- Leave request approval automatically updates the staff member's leave balance.
- Time logs are for profitability analysis only — not billing. The system does not generate invoices from time logs.
- Orders can exist without a BOQ (standalone supply) and BOQs can exist without a design phase (supply-only projects).
- A project template defines all phases and custom fields. Multiple templates can exist for different project types.

---

## 13. What This Replaces

| Current tool | Replaced by |
|-------------|-------------|
| Sales tracker spreadsheet | Sales pipeline + CRM |
| Project/design tracker spreadsheet | Design tracker + Project detail |
| Leave tracker spreadsheet | HR & people — leave management |
| Timesheet spreadsheet | Time tracking module |
| Product price list spreadsheet | Product catalog |
| Manual quote documents | Design fee calculator + Proposal generation |
| Manual invoice documents | Invoice module + PDF generation |
| WhatsApp/email for approvals | Client portal approval flows |
| Physical/email document sharing | Document management with client visibility |

The accounting software (Xero or SAGE) is the only external tool that is NOT replaced.

---

## 14. Open Questions (To Be Decided)

1. When a new template field is added, do existing projects get that column with an empty value, or only new projects?
2. When a template phase is deleted, what happens to projects currently on that phase?
3. For supply-only projects with no design phase — do they still go through the standard proposal and deposit flow?
4. For partial deliveries, should the project status automatically update to "Partial delivery" or should staff manually update it?
5. When multiple suppliers are used for one BOQ — should the system auto-split into one order per supplier (based on supplier field in catalog), or create one order and let staff split manually?
6. What are all the design fee types beyond Signature, Modus Signature, Modus Projects, Professional, and Portfolio?
7. Are there South African public holidays that need to be factored into leave calculations?
8. Should clients be able to pay invoices online via the portal (Stripe integration), or is EFT only?

---

*This document represents the full scope of the 1-to-1 World portal as designed in collaborative sessions during May 2026. All flows, modules, and architectural decisions have been agreed. This document is intended for handoff to a developer or AI development tool.*
