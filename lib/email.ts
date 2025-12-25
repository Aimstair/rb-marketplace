// Email utility for sending transactional emails using Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'RobloxTrade <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error("Failed to send email:", error)
      return false
    }

    console.log("Email sent successfully to:", options.to)
    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

export function generateVerificationEmail(code: string, username: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(to right, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">RobloxTrade</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Welcome, ${username}!</h2>
        <p style="font-size: 16px; color: #555;">Thank you for signing up for RobloxTrade. To complete your registration, please verify your email address.</p>
        
        <div style="background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
          <p style="font-size: 14px; color: #666; margin-bottom: 15px;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 15px;">This code will expire in 15 minutes</p>
        </div>
        
        <p style="font-size: 14px; color: #666;">If you didn't create an account with RobloxTrade, you can safely ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          © ${new Date().getFullYear()} RobloxTrade. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `
}

export function generatePasswordResetEmail(resetLink: string, username: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(to right, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">RobloxTrade</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">Hi ${username},</p>
        <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" style="background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 12px; border-radius: 4px;">
          ${resetLink}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 1 hour for security reasons.</p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          © ${new Date().getFullYear()} RobloxTrade. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `
}
