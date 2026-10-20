# 🩺 Doctor X — Three-Sided Clinic & Healthcare Platform

A secure, modern, full-stack healthcare platform architected for clinical governance, patient care coordination, electronic medical records (EMR/EHR), three-sided clinic operations (Patient, Doctor, Clinic), and automated consultation workflows.

---

## 🌟 Key Capabilities & Features

### 1. Three-Sided Healthcare Architecture
- **🧑‍💼 Patient Portal:** Discover clinics & doctors, book collision-proof consultation slots, pay consultation fees, review verified digital prescriptions, and dispatch Rx directly to WhatsApp.
- **🩺 Doctor Clinical Suite:** Live clinical queue, electronic medical records, SOAP clinical encounter documentation, and 1-click **Direct-to-WhatsApp Prescription Dispatch** with doctor credentials and digital verification seal.
- **🏥 Clinic Management & Financial Ledger:** Multi-doctor scheduling, consultation fee splitting, incoming patient collections ledger, doctor settlement payouts, and clinic balance wallet.
- **🛡️ Platform Governance:** Security audit logs, user role assignment, and compliance oversight.

### 2. Direct-to-WhatsApp Prescription System
- Structured clinical Rx pad with chief complaints, diagnoses, medication regimen, and food timing.
- One-click **"Send to WhatsApp"** button generating pre-formatted WhatsApp clinical messages with medication schedule, warnings, and digital verification seal sent directly to the patient's verified mobile number.

### 3. Collision-Proof Appointment & Payment Engine
- Dynamic doctor availability and slot generation.
- Database-enforced conflict prevention preventing double-booking across overlapping time slots.
- Supports **Demo Online Payment** (Razorpay simulation) and **Pay at Clinic** modes with verified payment receipts.

### 4. Zero-Data-Loss Persistent Storage
- Persistent on-disk snapshot database engine (`backend/data/doctor_x_persistent_data.json`) ensuring user accounts, appointments, clinics, and doctor records remain completely intact across laptop restarts and reboots.
- Automatic embedded database fallback with optional MongoDB Atlas connection.

### 6. Security, Privacy & Audit Trail
- Passwords hashed using `bcryptjs` (salt factor 10) and excluded from query projections by default.
- JWT authentication with expiry, HTTP security headers via `helmet`, CORS restriction, and express rate limiting.
- Comprehensive request validation on both frontend and backend using **Zod**.
- Tamper-evident `AuditLog` collection recording actor, action, resource, IP address, and timestamp.

---

## 🏗️ Technology Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Axios, React Router DOM v6 |
| **Backend** | Node.js (v24), Express 4 / 5 types, TypeScript, Zod, Morgan, Helmet, CORS, Express-Rate-Limit |
| **Database** | MongoDB Atlas with Mongoose ODM (includes zero-setup embedded MongoDB fallback for instant local dev & automated tests) |
| **Testing** | Jest, ts-jest, Supertest |
| **Documentation** | OpenAPI 3.0 / Swagger UI mounted at `/api-docs` |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation
Dependencies are already installed in both `backend` and `frontend`. To reinstall or update at any time:
```bash
# In project root
npm run install:all
```

### Environment Configuration
The backend comes pre-configured with a default `.env` file for local development.

To connect your MongoDB Atlas cluster:
1. Open `backend/.env`
2. Set your MongoDB Atlas URI:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/doctor-x?retryWrites=true&w=majority
   JWT_SECRET=doctor_x_dev_secret_key_2026_change_in_production
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```
> [!NOTE]
> If `MONGODB_URI` is left blank, the application automatically boots an embedded in-memory MongoDB server for seamless zero-friction local development and instant out-of-the-box testing.

---

## 🏃 Running the Application

### 1. Start the Backend API Server
```bash
cd backend
npm run dev
```
- API Base URL: `http://localhost:5000/api`
- OpenAPI / Swagger Docs: `http://localhost:5000/api-docs`
- Health Endpoint: `http://localhost:5000/api/health`

### 2. Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Frontend Application URL: `http://localhost:5173`

---

## 🧪 Demo Credentials (Pre-seeded Sample Accounts)

The database automatically seeds realistic healthcare accounts on initial startup:

| Role | Email | Password | Persona |
| :--- | :--- | :--- | :--- |
| **Doctor** | `doctor@doctorx.com` | `Doctor@2026` | Dr. Sarah Jenkins (Cardiologist) |
| **Patient** | `patient@doctorx.com` | `Patient@2026` | Eleanor Vance (Hypertension patient) |
| **Clinic Admin** | `clinic@doctorx.com` | `Clinic@2026` | Claire Temple (Clinic Operations) |
| **Platform Admin** | `admin@doctorx.com` | `Admin@2026` | Dr. Gregory House (Platform Governance) |

> [!TIP]
> The login screen (`http://localhost:5173/login`) features **Fast Demo Login** buttons for one-click authentication across any of the 4 roles.

---

## 🧪 Running Automated Tests

Run the backend integration test suite:
```bash
cd backend
npm test
```
The test suite validates:
- User registration, password hashing, and JWT creation
- RBAC protection and patient data ownership barriers
- Text search and patient record creation
- Appointment slot conflict prevention (HTTP 409 on collisions)
- Clinician-signed prescription creation

---

## 📁 Project Structure

```
Doctor/
├── backend/
│   ├── src/
│   │   ├── config/             # DB connection & Swagger OpenAPI specs
│   │   ├── controllers/        # Auth, Patient, Doctor, Appointment, Rx, etc.
│   │   ├── middleware/         # Auth, RBAC, Validation (Zod), ErrorHandler, AuditLog
│   │   ├── models/             # Mongoose schemas (User, Patient, Doctor, Appointment, Rx, etc.)
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # ReminderScheduler background worker & ID generator
│   │   ├── utils/              # Database seed script
│   │   ├── validations/        # Zod request validation schemas
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Server bootstrap and graceful shutdown
│   ├── tests/                  # Integration tests with Supertest & Jest
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios instance with JWT interceptors
│   │   ├── components/         # Navbar, Sidebar, Modals, Badges, PrescriptionPad
│   │   ├── context/            # AuthContext and NotificationContext
│   │   ├── pages/
│   │   │   ├── auth/           # Login (with fast demo pills) & Register
│   │   │   ├── doctor/         # Dashboard, Patient registry, Chart, Appointments, Rx Builder
│   │   │   ├── patient/        # Patient portal, Doctor directory, My Prescriptions, EMR
│   │   │   ├── clinic/         # Clinic admin overview & billing
│   │   │   └── admin/          # Platform metrics, user governance & audit trail
│   │   ├── types/              # Comprehensive TypeScript interfaces
│   │   ├── App.tsx             # Protected routing & RBAC navigation
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind CSS & print media optimizations
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── package.json                # Root orchestration scripts
└── README.md
```

---

## 🔒 Security, Privacy & Production Readiness Checklist

Before transitioning to public production deployment:
1. **Database:** Switch to MongoDB Atlas with TLS enabled, strict IP whitelisting, and role-based database credentials.
2. **Secrets:** Generate high-entropy 256-bit strings for `JWT_SECRET` and store in an encrypted secret manager (e.g., AWS Secrets Manager or HashiCorp Vault).
3. **HTTPS / TLS:** Serve strictly over HTTPS with modern HSTS headers enabled.
4. **Compliance:** Complete privacy impact assessment for applicable regional regulations (such as India's Digital Personal Data Protection Act / ABDM standards or HIPAA).
5. **AI Module:** If integrating clinical summary AI modules in the future, ensure strict clinician-in-the-loop review and explicit patient consent protocols.
