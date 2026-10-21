# Canva: next integration, not connected

No Canva OAuth flow, connector call, design creation, or account change has been
performed. Production stability comes first. Subsequent order: Google Workspace,
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
integration, OAuth consent and server-side token storage. Implement none of this
until the owner is told the exact authorization action and authorizes that step.
No new environment variables or permissions are needed for this preparation.

Sources reviewed 2026-10-21:
- https://www.canva.dev/docs/apps/rest-apis/autofill-guide/
- https://www.canva.dev/docs/apps/rest-apis/reference/autofills/create-design-autofill-job/
- https://www.canva.com/help/autofill/
