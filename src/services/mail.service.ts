import * as nodemailer from 'nodemailer'
import { Injectable } from "@nestjs/common";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "test@gmail.com",
        pass: "test1234"
      },
    });
  }

  async sendPasswordRestEmail(to: string, token: string) {
    const resetLink = `http://yourapp.com/reset-password?token=${token}`;
    const mailOptions = {
      from: "test@gmail.com",
      to: to,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`,
    }
  }
}