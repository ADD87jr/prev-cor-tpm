const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test Nodemailer',
      text: 'Acesta este un test simplu de trimitere email din script Node.js',
    });
    console.log('Rezultat Nodemailer:', info);
    if (info.rejected && info.rejected.length > 0) {
      console.error('Email REJECTED:', info.rejected);
    }
    if (info.response) {
      console.log('Răspuns SMTP:', info.response);
    }
  } catch (err) {
    console.error('Eroare la trimitere:', err);
    if (err && err.response) {
      console.error('Detalii răspuns SMTP:', err.response);
    }
  }
}

testEmail();
