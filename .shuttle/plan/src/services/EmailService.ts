// ============================================
// Email Service - Resend Integration
// Single Responsibility: Handle email sending
// ============================================

import { Resend } from 'resend';
import type { IEmailService, SkillRequestFormData } from '../types';

export class EmailService implements IEmailService {
  private resend: Resend | null = null;
  private readonly recipientEmail = 'frjj@thetechcollective.eu';
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'skills@yourdomain.com';
    
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('[Email] Resend client initialized');
    } else {
      console.warn('[Email] RESEND_API_KEY not set - emails will be logged only');
    }
  }

  async sendSkillRequest(data: SkillRequestFormData): Promise<boolean> {
    const subject = `[Skill Request] ${data.skillName} - Priority: ${data.priority.toUpperCase()}`;
    const htmlContent = this.generateEmailHtml(data);
    const textContent = this.generateEmailText(data);

    if (!this.resend) {
      // Log email for development without Resend
      console.log('[Email] Would send email:');
      console.log(`  To: ${this.recipientEmail}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Content:\n${textContent}`);
      return true;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: this.recipientEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('[Email] Skill request sent:', result);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }
  }

  private generateEmailHtml(data: SkillRequestFormData): string {
    const priorityColors: Record<string, string> = {
      low: '#4CAF50',
      medium: '#FFC107',
      high: '#FF9800',
      critical: '#F44336',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #555; margin-bottom: 4px; }
    .value { background: white; padding: 12px; border-radius: 4px; border-left: 3px solid #1a1a2e; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 12px; color: white; font-weight: 600; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔧 New Skill Request</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Claude Skills Platform</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Skill Name</div>
        <div class="value"><strong>${this.escapeHtml(data.skillName)}</strong></div>
      </div>
      
      <div class="field">
        <div class="label">Priority</div>
        <div class="value">
          <span class="priority" style="background: ${priorityColors[data.priority]};">
            ${data.priority.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div class="field">
        <div class="label">Description</div>
        <div class="value">${this.escapeHtml(data.description)}</div>
      </div>
      
      <div class="field">
        <div class="label">Use Case</div>
        <div class="value">${this.escapeHtml(data.useCase)}</div>
      </div>
      
      <div class="field">
        <div class="label">Example Inputs</div>
        <div class="value"><pre>${this.escapeHtml(data.exampleInputs)}</pre></div>
      </div>
      
      <div class="field">
        <div class="label">Expected Outputs</div>
        <div class="value"><pre>${this.escapeHtml(data.exampleOutputs)}</pre></div>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      
      <div class="field">
        <div class="label">Requester</div>
        <div class="value">
          ${this.escapeHtml(data.requesterName)}<br>
          <a href="mailto:${this.escapeHtml(data.requesterEmail)}">${this.escapeHtml(data.requesterEmail)}</a>
        </div>
      </div>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Submitted on ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private generateEmailText(data: SkillRequestFormData): string {
    return `
NEW SKILL REQUEST
=================

Skill Name: ${data.skillName}
Priority: ${data.priority.toUpperCase()}

Description:
${data.description}

Use Case:
${data.useCase}

Example Inputs:
${data.exampleInputs}

Expected Outputs:
${data.exampleOutputs}

---
Requester: ${data.requesterName}
Email: ${data.requesterEmail}
Submitted: ${new Date().toLocaleString()}
`.trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}

// Export singleton instance
export const emailService = new EmailService();
