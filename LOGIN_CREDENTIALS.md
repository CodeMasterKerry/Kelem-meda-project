# 🔐 Login Credentials

## Qelem Meda POS System

### Manager Account

- **Username:** `manager`
- **Password:** `password`
- **Role:** Manager
- **Access:** Full system access, approval management, reports

### Sales Officer Account

- **Username:** `officer`
- **Password:** `password`
- **Role:** Sales Officer
- **Access:** Create sales, view products, track own sales

---

## 🚀 Quick Start

1. Make sure the backend server is running:

   ```bash
   cd backend
   npm run dev
   ```

2. Make sure the frontend is running:

   ```bash
   cd frontend/frontend
   npm run dev
   ```

3. Open your browser and navigate to:

   ```
   http://localhost:3000/login
   ```

4. Use the credentials above to login

---

## 🔄 Reset Database

If you need to reset the database and reseed:

```bash
cd backend
npx prisma migrate reset
node prisma/seed.js
```

---

## 📝 Notes

- The password is hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 7 days
- All API endpoints (except login/register) require authentication
- The backend runs on port 5000
- The frontend runs on port 3000

---

## 🛠️ Troubleshooting

### Cannot Login?

1. Check if backend server is running on port 5000
2. Check if database is properly seeded
3. Verify credentials are correct (case-sensitive)
4. Check browser console for errors

### Database Issues?

1. Run `node prisma/seed.js` to reseed the database
2. Check `.env` file for correct DATABASE_URL
3. Ensure PostgreSQL is running

---

**Last Updated:** May 15, 2026
