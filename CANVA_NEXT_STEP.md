# Canva: authorization prepared, not connected

The owner selected their personal Canva Pro space containing TZALAM assets.
No new team or copied files are authorized. The production authorization route
is /integraciones/canva; it remains unconfigured until official credentials are
registered in Canva and set by the owner directly in Render. No external OAuth
grant, connector call, design creation, or account change has been performed. Production stability comes first. Subsequent order: Google Workspace,
Meta, then WhatsApp/ManyChat.

## Reuse existing content and approvals

Command already stores title, objective, hook, body, caption, CTA, visualBrief,
client, cycle, quality checks, assetUrl and human approval history. These are the
source of truth. Prepare copy and evidence in Command, autofill a reusable Canva
design/template, retrieve a preview, and return to the existing approval flow.
Do not publish or label a piece approved before the operator approves it.
Caption stays in Command unless a chosen template has an intentional caption
field. Human work should focus on approval or a concrete change request, rather
than manually laying out every publication.

## Proposed template field mapping (to validate, not implemented)

| Existing Command value | Suggested Canva field |
| --- | --- |
| title | TITLE |
| hook | HOOK |
| body | BODY |
| cta | CTA |
| approved image/asset | IMAGE |

Choose a base design once, validate its actual dataset and text limits, and use
Autofill to create copies. An existing generated design can be updated in place
when corrections are requested. No prospect/contact details need to leave
Command. Do not send any account secrets through chat.

## Account and authorization gate

First identify the intended Canva account/team and a plan that supports Autofill.
Canva's current official guide lists Pro, Teams and Enterprise (including eligible
Education/Nonprofits). Confirm the selected account's actual entitlement before
proposing any purchase. A chat Canva connector is not a server connection for
Command: unattended operation from Command requires an authorized Canva REST API
integration, OAuth consent and server-side token storage. OAuth reception is now implemented with PKCE S256, a 10-minute single-use state
bound to the owner session, and a protected callback at:
https://digital-command-center-5659.onrender.com/integraciones/canva/callback

Required Render variables, not yet configured: CANVA_CLIENT_ID and
CANVA_CLIENT_SECRET. The owner must generate/paste the secret directly between
Canva and Render; never share it in chat. No credentials are in this repository.
Credentials grant no account access until the owner personally consents in Canva.
If Canva shows a workspace selector, STOP and identify the existing personal Pro
space holding TZALAM before selecting anything. Do not create another workspace.

Tokens are exchanged only on the server and encrypted using AES-256-GCM. The
private key and encrypted grant are stored with permissions 0600 in a private
folder beside the persistent SQLite database. No tokens or remote errors appear
in HTML or logs. An unsuccessful OAuth attempt preserves an earlier grant.
No template/design/Brand Kit API requests are implemented in this preparation;
no background jobs, synchronization, design duplication, or publishing is enabled.
Refresh and design generation are subsequent work, not enabled by this change.

The Canva Developer Portal and home page returned HTTP 503 on 2026-10-21, also
confirmed by the owner in their personal browser. Account/integration discovery,
registration and consent cannot be completed until that external error clears.

Sources reviewed 2026-10-21:
- https://www.canva.dev/docs/apps/rest-apis/autofill-guide/
- https://www.canva.dev/docs/apps/rest-apis/reference/autofills/create-design-autofill-job/
- https://www.canva.com/help/autofill/
