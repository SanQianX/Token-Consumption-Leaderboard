import nodemailer from "nodemailer"
import { query } from "../db/client.js"

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const { rows } = await query("SELECT key, value FROM admin_settings WHERE key LIKE 'smtp_%'")
    const settings = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]))

    return {
      host: settings.smtp_host || process.env.SMTP_HOST || "smtp.163.com",
      port: parseInt(settings.smtp_port || process.env.SMTP_PORT || "465"),
      user: settings.smtp_user || process.env.SMTP_USER || "",
      pass: settings.smtp_pass || process.env.SMTP_PASS || "",
    }
  } catch {
    return {
      host: process.env.SMTP_HOST || "smtp.163.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    }
  }
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const config = await getSmtpConfig()

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  await transporter.sendMail({
    from: `"Token Leaderboard" <${config.user}>`,
    to: email,
    subject: "Token Leaderboard - Verification Code",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f5f5f5; text-align: center; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #666; margin-top: 16px;">This code expires in 10 minutes.</p>
      </div>
    `,
  })
}
