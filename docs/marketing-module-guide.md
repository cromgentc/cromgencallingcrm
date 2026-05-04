# Marketing Module Guide

The sidebar now has a Marketing dropdown with:

- Email Marketing
- SMS Marketing

## Current Flow

Both pages support local campaign planning:

1. Pick an audience segment.
2. Choose a template.
3. Edit campaign name, subject/message, and body.
4. Save as Draft, mark Ready, or mark Scheduled.
5. View/delete saved campaign entries from the queue.

Campaigns are stored per logged-in user in browser local storage under `calltrack_marketing_campaigns`.

## Email Marketing Recipients

Email Marketing now supports customer email entry before saving a campaign:

- Sidebar -> Marketing -> Email Marketing opens a new browser tab at `/marketing/email`.
- The new tab uses a Gmail-style layout with mailbox sidebar, Campaign Queue, search, and a full compose box.
- Add one customer manually with Customer Name and Customer Email ID.
- Paste bulk rows in CSV format.
- Upload Excel after saving it as CSV.

Required CSV columns:

```csv
name,email
Rahul Sharma,rahul@example.com
Priya Singh,priya@example.com
```

The email composer shows the selected recipient count, subject, and full email body box. Saved email campaigns show recipient count in Campaign Queue. `Send Now` uses the backend SMTP API.

Mailbox folders:

- Inbox
- Starred
- Sent
- Drafts
- Scheduled
- Spam

Sent emails are saved in the Sent folder. Draft and Scheduled emails are saved in the CRM database. Scheduled emails are checked by the backend scheduler every 30 seconds and sent when their date/time is due.

Incoming replies use Gmail IMAP sync. Enable IMAP in Gmail settings, keep the same Gmail App Password in `SMTP_PASS`, then click `Sync Inbox` in Email Marketing. Replies from customers are matched to sent campaigns by sender email and subject, then shown in Inbox on the same email thread.

## SMTP Send Setup

1. Go to Settings -> Email SMTP Gateway.
2. For Gmail, use:

```text
Provider: SMTP
Host: smtp.gmail.com
Port: 587
Username: yourgmail@gmail.com
Password: Gmail App Password
From Email: yourgmail@gmail.com
From Name: CromGen CRM
Secure: false
```

3. Click Save This API.
4. Open Marketing -> Email Marketing, add recipients, and click Send Now.

Backend endpoint:

```http
POST /api/marketing/email/send
GET /api/marketing/email/campaigns
POST /api/marketing/email/campaigns
POST /api/marketing/email/schedule
PATCH /api/marketing/email/campaigns/:campaignId
POST /api/marketing/email/sync-inbox
```

The API also supports `.env` fallback with `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, and `SMTP_FROM_NAME`.

## Sending Status

Actual sending is not enabled yet. Settings now has gateway setup sections so admin can keep the provider details ready:

- Settings -> Email SMTP Gateway
- Settings -> SMS Gateway

Email Marketing opens the Email SMTP Gateway section. SMS Marketing opens the SMS Gateway section. The current screen still creates draft, ready, and scheduled campaign plans only; the actual provider send API will be added after the SMTP/SMS provider is finalized.

Recommended next integrations:

- Email: SMTP, SendGrid, Amazon SES, Mailgun, or Zoho Mail API.
- SMS: Twilio, MSG91, Textlocal, Gupshup, or another DLT-approved provider.

Gateway configs are saved per logged-in user in browser local storage under `calltrack_integrations`. For production sending, move provider keys to backend `.env` or encrypted database storage before enabling the send endpoints.

## Files Changed

- `frontend/src/utils/navigation.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/MarketingView.jsx`
- `frontend/src/components/SettingsView.jsx`
- `frontend/src/components/EmailMarketingWorkspace.jsx`
- `frontend/src/App.jsx`

## Next Backend API Plan

Add these endpoints when provider credentials are ready:

```http
POST /api/marketing/sms/send
GET /api/marketing/campaigns
POST /api/marketing/campaigns
PATCH /api/marketing/campaigns/:campaignId
DELETE /api/marketing/campaigns/:campaignId
```

Keep provider keys only in backend `.env`, never in frontend local storage.
