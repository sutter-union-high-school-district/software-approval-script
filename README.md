# Software Approval Workflow

This repository contains a Google Apps Script workflow for K12 software and AI tool approval requests.

The script is designed to run from a Google Sheet connected to a Google Form. New form submissions are routed from department chair approval to IT approval to district approval. Approvers receive email links to approve or reject each request, and requesters are notified when the request is approved or rejected.

## Repository Contents

- `Code.gs`: Google Apps Script workflow code.
- `AGENTS.md`: Development guardrails for future agents and maintainers.

## How the Workflow Works

1. A requester submits the Google Form.
2. The response appears in the `Form Responses` sheet.
3. The installable form submit trigger runs `onFormSubmit(e)`.
4. The script looks up department chair approvers in the `Approvers` sheet.
5. Chair approvers receive an email with approve and reject links.
6. Approval links call the deployed web app through `doGet(e)`.
7. Approved requests move from chair to IT, then from IT to district.
8. District approval marks the request `Approved` and notifies the requester.
9. Any rejection marks the request `Rejected` and notifies the requester.

## Spreadsheet Setup

The Apps Script project must be attached to, or able to access, the Google Sheet that stores form responses.

### Required Sheets

Create or confirm these sheets:

- `Form Responses`
- `Approvers`

Sheet names must match exactly.

### Form Responses Headers

The `Form Responses` sheet must include these exact headers:

- `Department`
- `Status`
- `Current Approver`
- `Decision Comments`
- `Chair Decision Date`
- `IT Decision Date`
- `District Decision Date`
- `Email Address`
- `Software / AI Tool Name`
- `Requestor Name`
- `Purpose / Justification`
- `Sensitive Data Type (must be verified)`
- `Cost`

Header names are looked up by exact display text. Renaming one of these columns will break the workflow unless `Code.gs` is updated at the same time.

### Approvers Sheet

The `Approvers` sheet uses fixed column positions:

| Column | Header | Purpose |
| --- | --- | --- |
| A | Department | Department or workflow group name |
| B | Role | Approval role |
| C | Email | Approver email address |

Add one row per approver. Multiple approvers can share the same department and role.

Required approver patterns:

- Department chairs: department name matching the form's `Department` value, role `Chair`.
- IT approvers: department `IT`, role `IT`.
- District approvers: department `District`, role `District`.

Example:

| Department | Role | Email |
| --- | --- | --- |
| Math | Chair | mathchair@example.edu |
| Science | Chair | sciencechair@example.edu |
| IT | IT | itapprover@example.edu |
| District | District | districtapprover@example.edu |

## Setup Checklist

1. Create or connect the Google Form for software approval requests.
2. Confirm the form sends responses to the target Google Sheet.
3. Confirm the response sheet is named `Form Responses`.
4. Add any missing workflow columns listed in the Form Responses Headers section.
5. Create the `Approvers` sheet.
6. Add approver rows for every requesting department, plus the required `IT` and `District` rows.
7. Open the response spreadsheet.
8. Go to Extensions > Apps Script.
9. Paste or import the contents of `Code.gs` into the Apps Script project.
10. Save the Apps Script project.
11. Deploy the project as a web app.
12. Choose execute-as and access settings appropriate for district approvers.
13. Create an installable trigger for `onFormSubmit` using the form submit event.
14. Run or authorize the script with the owning Google account when prompted.
15. Submit a test form response.
16. Verify the chair approval email is sent.
17. Use approval links to verify chair, IT, and district approval routing.
18. Submit or reuse a test request to verify rejection notifies the requester.
19. Temporarily test missing chair, IT, or district approver configuration and confirm the expected `ERROR:` status is written.

## Email Credentials / Authorization

This script sends email with Google Apps Script `MailApp`. It does not use SMTP credentials.

Do not commit or paste email usernames, passwords, app passwords, SMTP secrets, or API keys into this repository or the Apps Script project.

Email sending is authorized through the Google account that owns, installs, or deploys the Apps Script project. During setup, that account must approve the requested Google Apps Script permissions. For continuity, a district-owned Google or admin account is recommended instead of an individual employee account.

Email sending may be affected by Google Workspace permissions, domain policies, and daily sending quotas.

## Web App Deployment Notes

Approval emails depend on `ScriptApp.getService().getUrl()` returning the deployed web app URL. If the deployment changes, submit a new test request and confirm the approval links still open the result page.

The approval links use these query parameters:

- `action=approve` or `action=reject`
- `row=<sheet row number>`
- `role=chair`, `role=it`, or `role=district`

Keep these parameters compatible unless you are intentionally changing the workflow and updating all generated links.

## Smoke Test Checklist

Use a test request and test approver accounts when possible.

- New form submission sets `Status` to `Pending Chair`.
- New form submission sets `Current Approver` to the matching chair email address.
- Chair approval sets `Status` to `Chair Approved` and forwards to IT.
- IT approval sets `Status` to `IT Approved` and forwards to district.
- District approval sets `Status` to `Approved` and `Current Approver` to `Complete`.
- Rejection sets `Status` to `Rejected` and writes `Decision Comments`.
- Requester receives approval or rejection email.
- Missing chair approver writes `ERROR: No Chair Found`.
- Missing IT approver writes `ERROR: No IT Approvers`.
- Missing district approver writes `ERROR: No District Approvers`.

## Troubleshooting

### Approval Link Is Invalid or Incomplete

Confirm the approval email link includes `action`, `row`, and `role` query parameters. If the Apps Script web app was redeployed, submit a fresh test request and use the newly generated links.

### Emails Are Not Sending

Confirm the script has been authorized by the owning Google account. Also check Google Workspace email policies and Apps Script daily sending quotas.

### No Approver Found

Check the `Approvers` sheet for an exact department and role match. Department chair lookups must match the submitted `Department` value. IT and district lookups must use `IT` / `IT` and `District` / `District`.

### Status Is Not Updating

Confirm the `Form Responses` headers match the required names exactly. Also confirm the approval link points to the correct deployed web app for this spreadsheet.

### Approval Emails Point to an Old Deployment

Redeploy the web app if needed, then submit a new test request. Existing emails may still contain older links.

## Development Notes

Keep changes aligned with `AGENTS.md`. In particular, preserve the chair to IT to district approval sequence unless a workflow change is explicitly requested.

Because this is a Google Apps Script project with no local test runner, document any behavior that could not be tested directly in Google Apps Script when reporting changes.
