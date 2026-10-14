# Technical Pack Generation & AI Specification Engine Plan

## Objective
Enable users in the **Orders** module to build, review, and export standardized **One to One Technical Sheets and Technical Packs** for client and contractor handover, converting unstructured supplier PDFs into the exact 3-section layout defined by Dean Boyce:
1. **Front Technical Page** (ratings dots, cut-out, dimensions, electrical wiring calculations).
2. **Installation Section** (step-by-step contractor instructions and graphics).
3. **Accessory Section** (exclusively the accessories/drivers ordered for that Type Code).
4. **Collation** into a cohesive **Technical Pack** with cover page, dynamic table of contents, and sign-off pages.

Zero database migrations/schema changes will be introduced at this stage; work runs in session memory and exports directly to PDF and Google Drive.

---

## Architectural Components

### 1. Backend Service: `backend/services/technical_pack_service.py`
- **Vertex AI Multimodal Spec Extraction**:
  - Connects to `gemini-2.5-flash` via GCP service tokens.
  - Ingests Supplier Datasheets & Installation Manuals (PDFs).
  - Extracts structured parameters: product name, supplier code, dimensions, cut-out, IP rating, dimming, wattage, CRI, CCT.
  - Automatically calculates:
    - *Driver Location*: Remote Wired / External Driver / Integrated Driver.
    - *# Fittings per Driver*: Based on BOQ pairing.
    - *Connection Type*: Straight Connection / Parallel / Series.
    - *Max Cable Run*: Specific meters or "Long Mains Runs".
  - Synthesizes clear, site-ready electrician instructions.
- **One to One HTML-to-PDF Engine**:
  - Renders the exact typography and layout of "THE VAULT: Technical" matching Dean's design.
  - Cover page: "ONE TO ONE BY MARTIN DÖLLER" + Project title + Client name.
  - Table of Contents with accurate page numbers.
  - 1-to-5 dot ratings component.
  - Step-by-step installation instructions with step numbering badges.
  - Produces vector A4 PDFs using `xhtml2pdf`.

### 2. Backend Routes: `backend/routes/technical_pack.py`
- `POST /api/technical-pack/analyze-fitting`: Accepts BOQ line item details + supplier PDF file(s) and returns AI-analyzed spec & wiring rules.
- `POST /api/technical-pack/generate-pdf`: Takes the complete structured pack payload and returns the compiled binary PDF.
- `POST /api/technical-pack/save-to-drive`: Saves the compiled PDF to the Order's Google Drive folder (`02 - Supplier POs & Confirmations` or `Documents`).
- Registered in `backend/main.py`.

### 3. Frontend Component: `frontend/src/components/orders/TechnicalPackModal.jsx`
- Groups active order BOQ items by **Type Code** (`A1`, `A2`, `AX1`, etc.).
- Pairs the main fitting with its sibling driver and accessories.
- Allows dragging/uploading supplier PDFs for each fitting mark.
- Displays AI-extracted details with inline editing for site notes, ratings, and wiring.
- Live preview and 1-click **Download PDF** & **Save to Project Drive**.

### 4. Orders Page Integration: `frontend/src/pages/OrdersPage.jsx`
- Adds a **📘 Technical Pack** button in the order header and documents tab.
- Opens `TechnicalPackModal` populated with the current order items, client name, and project metadata.

---

## Verification & Guardrails
- **Strict Staging Only**: All commits strictly on `staging`.
- **Zero Schema Disruptions**: No DDL migrations or alterations to existing tables.
- **Round-Trip Test**: Test with the provided `Supplier Technical Sheet.pdf` and `Supplier Installation Manual.pdf` to generate a real PDF that matches `Our Technical Sheet.pdf`.
