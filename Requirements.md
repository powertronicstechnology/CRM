# Project: Ray2Volt Solar CRM (Stage-Filter Layout)

## 1. Company Context
**Company Name:** Ray2Volt Solar Private Limited (R2V)
**HQ Location:** Srikalahasti, Andhra Pradesh.
**Operational Date:** November 2025 (Incorporated March 2025).

**Business Function:**
Ray2Volt provides end-to-end solar solutions (On-Grid, Off-Grid, Hybrid) for residential and commercial clients. A key part of the business involves financial facilitation—helping clients secure bank loans and government subsidies (specifically the *PM Surya Ghar Muft Bijli Yojana*).

**User Base (10-15 Users):**
The app will be used by the internal leadership and operations team, likely including:
*   **Operations:** Mandi Praveen (Director) & K. Venkateswarulu (GM).
*   **Sales/BD:** B. Srinadh and S. Arun Kumar.
*   **Branch Managers:** Managing flows for branches in Srikalahasti, Puttur, Tada, Pichatur, and Nagari.

**App Goal:**
To track customers through the solar installation pipeline, handling complex financial stages (loans/subsidies) and technical documentation (DISCOM submissions) across all branches.

---

## 2. Technical Requirements

### Strict Tech Stack
*   **Framework:** React.js (Vite)
*   **Language:** JavaScript (ES6+)
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **Backend:** Firebase Firestore (Web SDK)

### Implementation Rules for AI
*   **File Structure:** Single file preferred (`App.jsx`) or a very flat structure.
*   **Real-Time Data:** Must use Firebase `onSnapshot` so updates (adding customers/changing stages) appear instantly for all users (e.g., if the Tada branch manager adds a lead, the HQ sees it immediately).
*   **Layout Accuracy:** Strictly follow the Two-Pane (Sidebar vs. Grid) layout.

---

## 3. Authentication (Simulated)
*   **Concept:** Simple ID entry (No email/password).
*   **User ID Format:** `R2V00NNN` (Matches Company Acronym).
    *   *Example:* `R2V00101`
*   **Validation Logic:**
    *   Must match Regex: `^R2V00\d{3}$`
    *   If valid, use `signInAnonymously()` to authenticate with Firebase.
    *   Store the ID in the local state as the user's name.

---

## 4. Data Structure
**Collection Name:** `customers`

**Document Fields:**
*   **`quotationNumber`**: String, Unique ID.
    *   *Auto-generated format:* `R2V[MMYY]-00NN` (e.g., `R2V1125-0001` for Nov 2025).
*   **`currentStage`**: String (Exact Enum match to Stage List below).
*   **`customerName`**: String (Required).
*   **`phoneNumber`**: String.
*   **`location`**: String (e.g., "Puttur", "Nagari").
*   **`projectDescription`**: String (Required - e.g., "5kW Hybrid System").
*   **Financials** (Critical for Loan/Subsidy tracking):
    *   `quotedAmount`, `quotedPriceBank`, `paymentMode` ('Cash'/'Loan'), `bankBranch`, `accountNumber`, `ifscCode`.
*   **Technical** (For Installation & DISCOM):
    *   `meterCategory`, `ebNumber`, `dtrCode`, `sanctionedLoad`, `applicationNumber`.
*   **Other**:
    *   `mailId`, `locationLink`, `aadharNumber`.
*   **`remarks`**: String (Initial notes, e.g., "Power Audit completed").
*   **`followUps`**: Array of Objects: `[{ text, date, authorId }]`.

---

## 5. Dashboard UI & Layout
The app must utilize a **Two-Pane Layout**:

### A. Left Sidebar (Navigation)
*   **Top:** Ray2Volt Logo / App Name.
*   **Header:** Text "Project Stages".
*   **Content:** A vertical list of the 13 specific stages.
*   **Interaction:** Clicking a stage highlights it and filters the Main Area to show only customers in that stage.

**Stage List (Enum):**
1.  Leads (likely from Power Audits)
2.  Sales Closed
3.  Pending Loans/Advances (Financial Facilitation)
4.  Material Procurement
5.  Pending Installation
6.  Post-Installation Documentation
7.  Pending Document Submissions at DISCOM
8.  Meter Installation
9.  DISCOM Inspection
10. Subsidy Disbursment [Pending] (*PM Surya Ghar scheme*)
11. 2nd payment(from bank)
12. 3rd Payment
13. Projects Completed

### B. Main Content Area (Right)
*   **Top Header:**
    *   **Left:** Title of selected stage (e.g., "Pending Installation").
    *   **Right:** Prominent "Add Customer" Button.
*   **Grid Content:**
    *   Responsive Grid Layout:
        *   Mobile: 1 column
        *   Tablet: 2 columns
        *   Desktop: 3 columns
*   **Card UI Design:**
    *   **Style:** Simple white card with shadow.
    *   **Visible Fields:** Customer Name, Project Description, Location, Quoted Amount.
    *   **Stage Action:** Include a "Move to Next Stage" button or small Dropdown menu on the card to move customers without dragging.

---

## 6. Customer Detail View
*   **Trigger:** Opens as a Modal or Page when a card is clicked.
*   **Layout:** Clean grid layout showing all 20+ fields.
*   **Action Bar:** Dropdown to manually change the stage.
*   **Activity Log:** A "Follow Up" chat interface to add notes to the `followUps` array.