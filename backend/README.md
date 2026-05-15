# Qelem Meda POS - Backend

Smart Point of Sale System Backend API

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create a `.env` file in the root directory (already configured):

```env
DATABASE_URL=postgresql://Fuad:Fuad%40ab5659@localhost:5432/Smart_db
PORT=5000
JWT_SECRET=qelem_meda_pos_secret_key_2026_secure
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

3. Generate Prisma Client:

```bash
npx prisma generate
```

4. Run database migrations:

```bash
npx prisma migrate dev
```

5. (Optional) Seed the database:

```bash
npx prisma db seed
```

### Running the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Quick Test

Test if the server is running:

```bash
curl http://localhost:5000/api/auth/login
```

## 🔧 Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server with auto-reload
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Run database migrations
- `npx prisma generate` - Generate Prisma Client

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── src/
│   ├── config/
│   │   └── db.js          # Database configuration
│   ├── controllers/       # Route controllers
│   │   ├── authcontrollers.js
│   │   ├── productcontroller.js
│   │   ├── salescontroller.js
│   │   ├── categorycontroller.js
│   │   ├── inventorycontroller.js
│   │   ├── approvalcontroller.js
│   │   ├── usercontroller.js
│   │   ├── auditcontroller.js
│   │   └── reportcontroller.js
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   ├── routes/            # API routes
│   │   ├── authroutes.js
│   │   ├── productroutes.js
│   │   ├── salesroutes.js
│   │   ├── categoryroutes.js
│   │   ├── inventoryroutes.js
│   │   ├── approvalroutes.js
│   │   ├── userroutes.js
│   │   ├── auditroutes.js
│   │   └── reportroutes.js
│   ├── utils/
│   │   └── utils.js       # Utility functions & calculations
│   └── server.js          # Express server setup
├── .env                   # Environment variables
├── package.json
└── README.md
```

## 🔐 Default Users

After running migrations, you can create users via the register endpoint or use Prisma Studio.

**Manager:**

- Username: `manager`
- Password: `password`
- Role: `MANAGER`

**Sales Officer:**

- Username: `officer`
- Password: `password`
- Role: `SALES_OFFICER`

## 🌟 Features

- ✅ Auto-generated SKU for products
- ✅ Auto-generated invoice numbers
- ✅ Automatic VAT calculation (15%)
- ✅ Approval workflow for sales > 50,000 Birr
- ✅ Stock management with transaction history
- ✅ Role-based access control
- ✅ Complete audit trail
- ✅ Excel & PDF report generation
- ✅ Real-time inventory tracking

## 🛠️ Troubleshooting

### Server won't start

1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Run `npx prisma generate`
4. Check if port 5000 is available

### Database connection error

1. Verify PostgreSQL credentials
2. Check if database exists
3. Run migrations: `npx prisma migrate dev`

### Module not found errors

1. Delete node_modules: `rm -rf node_modules`
2. Reinstall: `npm install`
3. Regenerate Prisma Client: `npx prisma generate`

## 📞 Support

For issues or questions, contact the development team.

---

© 2026 Qelem Meda Technologies. All rights reserved.
