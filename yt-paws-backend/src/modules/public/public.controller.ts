import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

const shell = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Y&amp;T Paws</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#263b33;line-height:1.6}h1,h2{color:#2c4a3e}a{color:#2c4a3e}input,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;border:1px solid #9aa79f;border-radius:8px}button{background:#2c4a3e;color:#fff;font-weight:700}small{color:#667}</style></head><body>${body}<hr><small>Contact: ${process.env.SUPPORT_EMAIL ?? 'support@ytpaws.example'}</small></body></html>`;

@Controller()
export class PublicController {
  @Get('privacy')
  privacy(@Res() res: Response) {
    res.type('html').send(shell('Privacy Policy', `<h1>Privacy Policy</h1><p>Last updated: 2 August 2026.</p><h2>Data we process</h2><p>We process account contact details, pet profiles and health notes, booking and care reports, photos, notification tokens, payment status/provider references, and limited login-security events to operate and protect Y&amp;T Paws.</p><h2>Storage and sharing</h2><p>Images are stored in configured cloud object storage under random object keys. Payment card details are handled by Stripe and are not stored by Y&amp;T Paws. We share data only with service providers needed to run the service or where legally required.</p><h2>Deletion and retention</h2><p>Security events expire after 90 days. Account deletion anonymises the account and removes its security events, pet care details, health records, report text/photos and notifications. Minimal booking, service-price snapshot and payment records are retained for accounting, refunds, fraud prevention and disputes. See the <a href="/account-deletion">account deletion page</a>.</p><h2>Your choices</h2><p>You may request access, correction or deletion using the App or the external request page.</p>`));
  }

  @Get('terms')
  terms(@Res() res: Response) {
    res.type('html').send(shell('Terms of Service', `<h1>Terms of Service</h1><p>Last updated: 1 August 2026.</p><p>Y&amp;T Paws provides booking, pet-care reporting and payment coordination. You must provide accurate information, keep credentials secure and use the service lawfully.</p><h2>Bookings and payments</h2><p>Prices shown at booking are recorded with the booking. Cancellation and refund eligibility follow the policy presented for the service. Stripe and WeChat payments may also be subject to their providers' terms.</p><h2>Availability</h2><p>We aim to keep the service available but do not promise uninterrupted operation. Nothing in these terms excludes rights that cannot legally be excluded.</p>`));
  }

  @Get('account-deletion')
  deletion(@Res() res: Response) {
    res.type('html').send(shell('Account Deletion', `<h1>Delete your Y&amp;T Paws account</h1><p>The fastest verified method is Profile → Delete account in the App. If you cannot access the App, email the support address below from your registered email with subject “Account deletion request”. We will verify ownership before processing.</p><h2>Deleted</h2><p>Profile contact data, security events tied to the account/email hash, pet care details and health records, report text and photos, notification tokens and password-reset records are removed or anonymised.</p><h2>Retained</h2><p>Minimal booking, service-price snapshot and payment records are retained only for accounting, refunds, fraud prevention and dispute obligations. They remain linked to an anonymised identifier, not your original email or name.</p>`));
  }

  @Get('reset-password')
  reset(@Query('token') token: string | undefined, @Res() res: Response) {
    const safeToken = JSON.stringify(token ?? '');
    res.type('html').send(shell('Reset Password', `<h1>Reset your password</h1><p><a id="openApp" href="ytpaws://reset-password?token=${encodeURIComponent(token ?? '')}">Open in the Y&amp;T Paws App</a></p><p>If the App is not installed, reset it here:</p><form id="form"><input id="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="New password (letters and numbers)" required><button>Reset password</button></form><p id="result" role="status"></p><script>const token=${safeToken};document.getElementById('form').addEventListener('submit',async(e)=>{e.preventDefault();const result=document.getElementById('result');result.textContent='Resetting…';const response=await fetch('/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword:document.getElementById('password').value})});const body=await response.json().catch(()=>({}));result.textContent=response.ok?'Password reset. You can now sign in.':(Array.isArray(body.message)?body.message[0]:body.message)||'This link is invalid or expired.'});</script>`));
  }
}
