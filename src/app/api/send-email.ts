import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, text, html, attachments }: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 3000,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments,
  });
}
