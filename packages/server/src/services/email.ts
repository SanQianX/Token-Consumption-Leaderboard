import nodemailer from "nodemailer"

const SMTP_HOST = process.env.SMTP_HOST || "smtp.163.com"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465")
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASS = process.env.SMTP_PASS || ""

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"Token Leaderboard" <${SMTP_USER}>`,
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
