// Script pentru actualizarea informațiilor de business în Stripe
// Rulează cu: node scripts/update-stripe-business.js

const fs = require('fs');
const path = require('path');

// Citește .env manual
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
const stripeKey = match ? match[1].trim() : null;

if (!stripeKey) {
  console.error('Nu am găsit STRIPE_SECRET_KEY în .env');
  process.exit(1);
}

const Stripe = require('stripe');
const stripe = new Stripe(stripeKey);

async function updateBusinessProfile() {
  try {
    // Încearcă să actualizeze profilul de business
    const account = await stripe.accounts.update(
      'acct_1SFcvsJJBKFY4Z0x', // Account ID-ul tău din Stripe
      {
        business_profile: {
          support_email: 'office@prevcortpm.ro',
          support_phone: '+40744000000', // Înlocuiește cu telefonul real
          support_url: 'https://prevcortpm.ro',
          name: 'Prev-Cor TPM SRL'
        }
      }
    );
    console.log('✅ Profil actualizat cu succes!');
    console.log('Support email:', account.business_profile?.support_email);
  } catch (error) {
    if (error.code === 'account_invalid') {
      console.log('⚠️ Nu se poate actualiza contul principal prin API.');
      console.log('');
      console.log('Soluție alternativă:');
      console.log('1. Mergi la: https://dashboard.stripe.com/settings/public');
      console.log('2. Sau: https://dashboard.stripe.com/settings/branding');
      console.log('3. Completează Support email: office@prevcortpm.ro');
    } else {
      console.error('Eroare:', error.message);
    }
  }
}

updateBusinessProfile();
