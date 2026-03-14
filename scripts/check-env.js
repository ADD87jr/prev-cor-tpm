// Script pentru verificarea variabilelor ENV
// Rulează: node scripts/check-env.js

const requiredEnvVars = {
  // Database
  DATABASE_URL: { required: true, description: "SQLite/Turso database URL" },
  TURSO_DATABASE_URL: { required: false, description: "Turso database URL (production)" },
  TURSO_AUTH_TOKEN: { required: false, description: "Turso auth token" },
  
  // Auth
  NEXTAUTH_SECRET: { required: true, description: "NextAuth secret key (generate: openssl rand -base64 32)", sensitive: true },
  NEXTAUTH_URL: { required: false, description: "NextAuth URL (auto-detected in Vercel)" },
  ADMIN_PASSWORD: { required: true, description: "Admin panel password", sensitive: true },
  
  // Email - SMTP
  SMTP_HOST: { required: true, description: "SMTP server host (e.g., smtp.gmail.com)" },
  SMTP_PORT: { required: true, description: "SMTP port (587 for TLS)" },
  SMTP_USER: { required: true, description: "SMTP username/email" },
  SMTP_PASS: { required: true, description: "SMTP password/app password", sensitive: true },
  SMTP_FROM: { required: false, description: "From email address" },
  CONTACT_EMAIL: { required: false, description: "Contact form recipient email" },
  ADMIN_EMAIL: { required: false, description: "Admin notification email" },
  
  // Email - Resend (alternative)
  RESEND_API_KEY: { required: false, description: "Resend API key (alternative to SMTP)", sensitive: true },
  EMAIL_FROM: { required: false, description: "Email from address" },
  EMAIL_FROM_NAME: { required: false, description: "Email from name" },
  
  // AI
  GEMINI_API_KEY: { required: false, description: "Google Gemini AI API key", sensitive: true },
  OPENAI_API_KEY: { required: false, description: "OpenAI API key (fallback)", sensitive: true },
  
  // Stripe
  STRIPE_SECRET_KEY: { required: false, description: "Stripe secret key", sensitive: true },
  STRIPE_WEBHOOK_SECRET: { required: false, description: "Stripe webhook secret", sensitive: true },
  
  // Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: { required: false, description: "VAPID public key for push notifications" },
  VAPID_PRIVATE_KEY: { required: false, description: "VAPID private key", sensitive: true },
  VAPID_EMAIL: { required: false, description: "VAPID contact email" },
  
  // Sentry
  SENTRY_DSN: { required: false, description: "Sentry error tracking DSN" },
  NEXT_PUBLIC_SENTRY_DSN: { required: false, description: "Sentry client-side DSN" },
  SENTRY_ORG: { required: false, description: "Sentry organization slug" },
  SENTRY_PROJECT: { required: false, description: "Sentry project slug" },
  
  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: { required: false, description: "Google Analytics 4 ID" },
  NEXT_PUBLIC_GA_ID: { required: false, description: "Google Analytics ID (alias)" },
  NEXT_PUBLIC_CLARITY_ID: { required: false, description: "Microsoft Clarity ID" },
  GOOGLE_VERIFICATION_CODE: { required: false, description: "Google Search Console verification" },
  
  // OAuth
  GOOGLE_CLIENT_ID: { required: false, description: "Google OAuth client ID" },
  GOOGLE_CLIENT_SECRET: { required: false, description: "Google OAuth client secret", sensitive: true },
  FACEBOOK_CLIENT_ID: { required: false, description: "Facebook OAuth client ID" },
  FACEBOOK_CLIENT_SECRET: { required: false, description: "Facebook OAuth client secret", sensitive: true },
  
  // Security
  BACKUP_ENCRYPTION_KEY: { required: false, description: "Backup encryption key (32+ chars)", sensitive: true },
  SECURITY_ALERT_EMAIL: { required: false, description: "Security alerts recipient" },
  CRON_SECRET: { required: false, description: "Cron job authentication secret", sensitive: true },
  
  // Site
  NEXT_PUBLIC_SITE_URL: { required: false, description: "Public site URL" },
  NEXT_PUBLIC_BASE_URL: { required: false, description: "Base URL (alias)" },
};

console.log("\n🔍 Verificare variabile de mediu\n");
console.log("=".repeat(60));

let missingRequired = 0;
let missingOptional = 0;
let configured = 0;
let warnings = [];

for (const [key, config] of Object.entries(requiredEnvVars)) {
  const value = process.env[key];
  const hasValue = value && value.length > 0;
  
  if (hasValue) {
    configured++;
    const displayValue = config.sensitive ? "***" + value.slice(-4) : value;
    console.log(`✅ ${key}: ${displayValue}`);
    
    // Check for default/weak values
    if (key === "NEXTAUTH_SECRET" && (value === "default-secret" || value.length < 32)) {
      warnings.push(`⚠️  ${key}: Valoare prea scurtă sau default - SCHIMBĂ în producție!`);
    }
    if (key === "ADMIN_PASSWORD" && value.length < 8) {
      warnings.push(`⚠️  ${key}: Parolă prea scurtă (minim 8 caractere)`);
    }
  } else if (config.required) {
    missingRequired++;
    console.log(`❌ ${key}: LIPSEȘTE (OBLIGATORIU) - ${config.description}`);
  } else {
    missingOptional++;
    console.log(`⚪ ${key}: nesetat - ${config.description}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log(`\n📊 Rezultat:`);
console.log(`   ✅ Configurate: ${configured}`);
console.log(`   ❌ Lipsă obligatorii: ${missingRequired}`);
console.log(`   ⚪ Lipsă opționale: ${missingOptional}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Avertismente:`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (missingRequired > 0) {
  console.log(`\n🚨 Aplicația poate să nu funcționeze corect fără variabilele obligatorii!`);
  process.exit(1);
} else {
  console.log(`\n✅ Toate variabilele obligatorii sunt configurate!`);
}
