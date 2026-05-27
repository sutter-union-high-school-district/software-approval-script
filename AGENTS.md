# AGENTS.md

## Purpose

This repository contains a Google Apps Script workflow for K12 software approval requests.

Google Forms submissions land in the `Form Responses` sheet. The script routes each request through department chair approval, IT approval, and district approval, with email notifications for approvers, requesters, and configuration errors.

Treat this workflow as district operations code. Changes should be cautious, easy to review, and compatible with the existing spreadsheet and email approval process.

## Current Sheet Contract

The script depends on these sheets:

- `Form Responses`
- `Approvers`

The `Approvers` sheet uses fixed column positions:

- Column A: Department
- Column B: Role
- Column C: Email

The `Form Responses` sheet uses exact header names. Header renames are breaking changes unless the migration impact is called out clearly.

Required `Form Responses` headers currently used by `Code.gs`:

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

## Workflow Invariants

Preserve this approval sequence unless the user explicitly requests a workflow change:

1. New form submissions start with department chair approval.
2. Chair approval forwards the request to IT approvers configured with department `IT` and role `IT`.
3. IT approval forwards the request to district approvers configured with department `District` and role `District`.
4. District approval marks the request `Approved`, sets the current approver to `Complete`, and notifies the requester.
5. Any rejection marks the request `Rejected`, records a decision comment, and notifies the requester.

Do not change sheet names, header names, status values, URL parameters, or role names without documenting the migration impact and expected spreadsheet changes.

## Development Rules

- Keep edits focused in `Code.gs` unless adding explicit project support files such as documentation.
- Assume manual Google Apps Script deployment. Do not introduce `clasp`, package managers, local build systems, or generated project structure unless the user asks for them.
- Protect requester and student-related data. Avoid logging sensitive form content or expanding email content beyond what approvers need.
- Keep email wording professional, minimal, and suitable for a K12 district context.
- Prefer small helper functions and targeted changes over broad rewrites.
- If modifying HTML email bodies or result pages, escape or sanitize user-entered values before inserting them into HTML.
- If touching spreadsheet access, add or preserve defensive handling for missing sheets, missing headers, invalid rows, and empty approver email cells.
- Preserve compatibility with Apps Script services used here, including `SpreadsheetApp`, `MailApp`, `ScriptApp`, and `HtmlService`.

## Testing Guidance

There is no local test runner configured. Verify changes with manual or Apps Script test cases instead of assuming local tests exist.

For workflow changes, use this checklist:

- Simulate `onFormSubmit(e)` with a row from `Form Responses`.
- Verify missing chair, IT, and district approver paths set the expected `ERROR:` status and notify admins when possible.
- Verify approve links advance status and current approver for chair, IT, and district roles.
- Verify reject links mark the row rejected and notify the requester.
- Verify generated approval links include `action`, `row`, and `role` parameters.

In final responses, document any Google-only behavior that was not tested directly.
