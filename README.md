# E-SIMS: Smart Inventory Management System

E-SIMS is a robust, production-ready Point of Sale (POS) and Inventory Management System designed to streamline sales operations, inventory tracking, and financial reporting. It features a dual-portal architecture for **Managers** and **Sales Officers**, ensuring a secure and efficient workflow.
System Functionality & Workflow

The system is built around a "Prepare-and-Approve" workflow to maintain data integrity and financial accountability.

1. Sales Workflow
   **Creation**: Sales Officers create new sales transactions.
   **Stock Validation**: The system checks real-time inventory levels before allowing a sale.
   **Approval**: Depending on configuration, sales may require Manager approval.
   **Stock Deduction**: Upon approval, inventory is automatically decremented.
   **Financial Record**: A financial transaction (Income) is created for every approved sale.
2. Inventory Workflow
   **Product Intake**: Managers or authorized officers add products to the system.
   **Categorization**: Products are organized by categories for better tracking.
   **Threshold Alerts**: The system monitors low stock levels based on defined thresholds.
   **History Tracking**: Every stock movement (IN/OUT) is logged in the `InventoryTransaction` table.
3. Reporting Workflow
   **Generation**: Both Managers and Sales Officers can generate reports (PDF/Excel).
   **Validation**: Reports include digital "prepared by" and "approved by" signatures.
   **Automation**: Statistics are calculated in real-time for dashboards and analytics.
   Technology Stack
   **Frontend**: Next.js (TypeScript), Tailwind CSS, Lucide React (Icons).
   **Backend**: Node.js, Express.js.
   **Database**: PostgreSQL with Prisma ORM.
   **Reporting**: PDFKit / ExcelJS.
   Project Structure

├── backend/ # Express API & Database (Prisma)
│ ├── prisma/ # Schema & Migrations
│ └── src/ # Controllers, Routes, Middleware
└── frontend/
└── frontend/ # Next.js Application
├── app/ # App Router (Manager & Sales Officer portals)
├── components/ # Shared UI Components
└── store/ # State Management

Setup & Installation
Prerequisites
Node.js (v18+)
PostgreSQL Database
npm or yarn

Step 1: Backend Setup

1. Navigate to the backend directory:
   cd backend
2. Install dependencies:
   npm install
3. Configure Environment:
   Create a `.env` file in the `backend` folder:
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/esims_db?schema=public"
   JWT_SECRET="your_secret_key"
   PORT=5000
4. Initialize Database:
   npx prisma migrate dev --name init
   npm run seed
5. Start Server:
   npm run dev
   Step 2: Frontend Setup
6. Navigate to the frontend directory:
   cd frontend/frontend
7. Install dependencies:
   npm install
8. Start Development Server:
   npm run dev
9. Access the App:
   Open [http://localhost:3000](http://localhost:3000)

User Portals & Features

**Sales Officer Portal**
**Dashboard**: Personal sales performance metrics.
**New Sale**: Interactive interface to search products and create invoices.
**Manage Products**: Submit new products or updates for approval.
**My Sales**: View and track history of personal transactions.
**Reports**: Download individual sales reports.

**Manager Portal**
**Admin Dashboard**: System-wide analytics (Revenue, Profit, Stock levels).
**Approvals**: Review and approve/reject pending sales and product updates.
**Inventory Management**: Full control over products, categories, and stock.
**User Management**: Create and manage Sales Officer accounts.
**System Reports**: Generate comprehensive financial and inventory audits.
