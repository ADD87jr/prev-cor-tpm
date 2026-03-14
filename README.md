This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🔒 Backup și Restaurare Baza de Date

### Backup Manual
Pentru a crea un backup complet al bazei de date (include toate tabelele în format JSON + copie SQLite):

```bash
npm run db:backup
```

Backup-urile sunt salvate în `backups/` cu timestamp. Se păstrează automat ultimele 10 backup-uri.

### Backup Automat
- **La fiecare build** (`npm run build`) se creează automat un backup
- Pentru backup zilnic programat, rulează o singură dată: `.\setup_backup_task.ps1`

### Restaurare Date
Pentru a restaura datele din cel mai recent backup:

```bash
npm run db:restore
```

Sau din un backup specific:
```bash
node scripts/restore-database.js backups/json-backup-2026-03-01T10-28-32
```

### Sincronizare Furnizori (Turso ↔ SQLite local)
Pentru a sincroniza furnizorii între producție (Turso) și local (SQLite):

```bash
# Turso → SQLite local (implicit)
node scripts/sync-suppliers.js

# SQLite local → Turso
node scripts/sync-suppliers.js --to-turso

# Previzualizare fără a salva
node scripts/sync-suppliers.js --dry-run
```

**Important:** Rulează sincronizarea după fiecare restaurare sau când ai nevoie să aliniezi datele între local și producție.

---

## Populare rapidă a bazei de date (seed)

Pentru a popula rapid baza de date cu produse de test, rulează comanda:

```bash
npm run seed
```

Acest script va adăuga automat produse de test în baza de date folosind Prisma și SQLite. Folosește această metodă pentru orice inițializare sau resetare rapidă a datelor de test.

---
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
