// import * as functions from "firebase-functions";
// import * as nodemailer from "nodemailer"; // Uncomment when installing nodemailer

/**
 * Interface for Email Options
 */
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// Environment variables should be set via:
// firebase functions:config:set smtp.host="smtp.gmail.com" smtp.user="email@gmail.com" smtp.pass="password" smtp.port="587"
// const smtpConfig = {
//     host: process.env.SMTP_HOST || functions.config().smtp?.host,
//     user: process.env.SMTP_USER || functions.config().smtp?.user,
//     pass: process.env.SMTP_PASS || functions.config().smtp?.pass,
//     port: process.env.SMTP_PORT || functions.config().smtp?.port || 587,
// };

// Create transporter only if config exists
// const transporter = (smtpConfig.host && smtpConfig.user && smtpConfig.pass) 
//     ? nodemailer.createTransport({
//         host: smtpConfig.host,
//         port: Number(smtpConfig.port),
//         secure: false, // true for 465, false for other ports
//         auth: {
//             user: smtpConfig.user,
//             pass: smtpConfig.pass,
//         },
//     })
//     : null;

/**
 * Sends an email using the configured SMTP server or logs it if no config is found.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    console.log(`[EmailService] 📧 Preparing to send email to: ${to}`);
    // console.log(`[EmailService] Creds check: Host=${!!smtpConfig.host}, User=${!!smtpConfig.user}`);

    // if (transporter) {
    //     try {
    //         const info = await transporter.sendMail({
    //             from: `"ProBPA System" <${smtpConfig.user}>`,
    //             to,
    //             subject,
    //             html,
    //             text: text || html.replace(/<[^>]*>?/gm, ''), // fallback strip tags
    //         });
    //         console.log(`[EmailService] ✅ Email sent: ${info.messageId}`);
    //         return true;
    //     } catch (error) {
    //         console.error(`[EmailService] ❌ Failed to send email:`, error);
    //         return false;
    //     }
    // } else {
    // Fallback: Log email content for development/debugging
    console.warn(`[EmailService] ⚠️ SMTP not configured. Logging email instead.`);
    console.log(`
---------------------------------------------------
TO: ${to}
SUBJECT: ${subject}
---------------------------------------------------
${text || html.replace(/<br>/g, '\n').replace(/<[^>]*>?/gm, '')}
---------------------------------------------------
RAW HTML:
${html}
---------------------------------------------------
        `);
    return true; // Simulate success
    // }
}
