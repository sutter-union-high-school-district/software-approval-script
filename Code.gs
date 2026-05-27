/**************** CONFIGURATION ****************/
const FORM_SHEET_NAME = "Form Responses";
const APPROVERS_SHEET_NAME = "Approvers";

/**************** FORM SUBMISSION ****************/
function onFormSubmit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== FORM_SHEET_NAME) return;

  const row = e.range.getRow();
  const headers = getHeaders(sheet);

  const department = sheet.getRange(row, headers["Department"]).getValue().toString().trim();
  const chairEmails = lookupApprovers(department, "Chair");

  if (chairEmails.length === 0) {
    sheet.getRange(row, headers["Status"]).setValue("ERROR: No Chair Found");
    notifyAdmins("No Chair Found", `Department: ${department}, Row: ${row}`);
    return;
  }

  sheet.getRange(row, headers["Status"]).setValue("Pending Chair");
  sheet.getRange(row, headers["Current Approver"]).setValue(chairEmails.join(", "));

  sendApprovalEmail(
    chairEmails,
    "Department Chair Approval Required",
    buildApprovalEmail(sheet, row, "chair")
  );
}

/**************** WEB APP HANDLER ****************/
function doGet(e) {
  const action = e.parameter.action;
  const row = Number(e.parameter.row);
  const role = e.parameter.role;

  if (!action || !row || !role) {
    return buildResultPage(
      "Invalid Approval Link",
      "This approval link is invalid or incomplete.",
      "error"
    );
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FORM_SHEET_NAME);
  const headers = getHeaders(sheet);

  if (action === "reject") {
    sheet.getRange(row, headers["Status"]).setValue("Rejected");
    sheet.getRange(row, headers["Decision Comments"]).setValue(`${role} rejected`);
    notifyRequester(sheet, row, "rejected");
    return buildResultPage("Request Rejected","The request has been successfully rejected.","error");
  }

  if (role === "chair") {
    const itEmails = lookupApprovers("IT", "IT");

    if (itEmails.length === 0) {
      sheet.getRange(row, headers["Status"]).setValue("ERROR: No IT Approvers");
      notifyAdmins("No IT Approvers Configured", `Row: ${row}`);
      return buildResultPage("Configuration Error","No IT approvers are configured.","error");
    }

    sheet.getRange(row, headers["Status"]).setValue("Chair Approved");
    sheet.getRange(row, headers["Chair Decision Date"]).setValue(new Date());
    sheet.getRange(row, headers["Current Approver"]).setValue(itEmails.join(", "));

    sendApprovalEmail(itEmails,"IT Approval Required",buildApprovalEmail(sheet, row, "it"));

    return buildResultPage("Chair Approval Recorded","The request has been forwarded to IT.","success");
  }

  if (role === "it") {
    const districtEmails = lookupApprovers("District", "District");

    if (districtEmails.length === 0) {
      sheet.getRange(row, headers["Status"]).setValue("ERROR: No District Approvers");
      notifyAdmins("No District Approvers Configured", `Row: ${row}`);
      return buildResultPage("Configuration Error","No District approvers are configured.","error");
    }

    sheet.getRange(row, headers["Status"]).setValue("IT Approved");
    sheet.getRange(row, headers["IT Decision Date"]).setValue(new Date());
    sheet.getRange(row, headers["Current Approver"]).setValue(districtEmails.join(", "));

    sendApprovalEmail(districtEmails,"District Approval Required",buildApprovalEmail(sheet, row, "district"));

    return buildResultPage("IT Approval Recorded","The request has been forwarded to District.","success");
  }

  if (role === "district") {
    sheet.getRange(row, headers["Status"]).setValue("Approved");
    sheet.getRange(row, headers["District Decision Date"]).setValue(new Date());
    sheet.getRange(row, headers["Current Approver"]).setValue("Complete");

    notifyRequester(sheet, row, "approved");
    return buildResultPage("Request Approved","The approval workflow is complete.","success");
  }

  return buildResultPage("Unknown Action","Please contact an administrator.","error");
}

/**************** APPROVER LOOKUP ****************/
function lookupApprovers(department, role) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPROVERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const emails = [];

  for (let i = 1; i < data.length; i++) {
    const deptCell = data[i][0]?.toString().trim();
    const roleCell = data[i][1]?.toString().trim();
    const emailCell = data[i][2]?.toString().trim();

    if (deptCell === department && roleCell === role && emailCell) {
      emails.push(emailCell);
    }
  }

  return emails;
}

/**************** EMAIL HELPERS ****************/
function sendApprovalEmail(toList, subject, body) {
  if (!toList || toList.length === 0) return;

  MailApp.sendEmail({
    to: toList.join(","),
    subject: subject,
    htmlBody: body
  });
}

function notifyRequester(sheet, row, outcome) {
  const headers = getHeaders(sheet);
  const email = sheet.getRange(row, headers["Email Address"]).getValue();
  const requestor = sheet.getRange(row, headers["Requestor Name"]).getValue();
  const tool = sheet.getRange(row, headers["Software / AI Tool Name"]).getValue();

  MailApp.sendEmail({
    to: email,
    subject: `Software / AI Request ${outcome.toUpperCase()}`,
    htmlBody: `<p>Hello ${escapeHtml(requestor)},</p>
      <p>Your request for <strong>${escapeHtml(tool)}</strong> has been <strong>${escapeHtml(outcome.toUpperCase())}</strong>.</p>`
  });
}

function notifyAdmins(subject, message) {
  const itEmails = lookupApprovers("IT", "IT");
  if (itEmails.length === 0) return;

  MailApp.sendEmail({
    to: itEmails.join(","),
    subject: `Workflow Configuration Error: ${subject}`,
    htmlBody: `<p>${message}</p>`
  });
}

/**************** EMAIL BODY BUILDER ****************/
function buildApprovalEmail(sheet, row, role) {
  const headers = getHeaders(sheet);

  const requestor = escapeHtml(sheet.getRange(row, headers["Requestor Name"]).getValue());
  const tool = escapeHtml(sheet.getRange(row, headers["Software / AI Tool Name"]).getValue());
  const justification = escapeHtml(sheet.getRange(row, headers["Purpose / Justification"]).getValue());
  const dataType = escapeHtml(sheet.getRange(row, headers["Sensitive Data Type (must be verified)"]).getValue());
  const cost = escapeHtml(sheet.getRange(row, headers["Cost"]).getValue());

  let baseUrl = ScriptApp.getService().getUrl();

  baseUrl = baseUrl.replace(
    /^https:\/\/script\.google\.com\/a\/([^\/]+)\/macros\//,
    "https://script.google.com/a/macros/$1/"
  );

  return `
  <p><strong>Software / AI Request Approval</strong></p>
  <p>A request from <strong>${requestor}</strong> requires your review.</p>
  <ul>
    <li><strong>Requestor:</strong> ${requestor}</li>
    <li><strong>Tool:</strong> ${tool}</li>
    <li><strong>Justification:</strong> ${justification}</li>
    <li><strong>Data Type:</strong> ${dataType}</li>
    <li><strong>Cost:</strong> ${cost}</li>
  </ul>
  <p>
    <a href="${baseUrl}?action=approve&row=${row}&role=${role}">Approve</a> |
    <a href="${baseUrl}?action=reject&row=${row}&role=${role}">Reject</a>
  </p>
  `;
}

/**************** RESULT PAGE BUILDER ****************/
function buildResultPage(title, message, statusType) {
  const colorMap = { success: "#188038", error: "#d93025", info: "#1a73e8" };
  const accent = colorMap[statusType] || "#1a73e8";

  return HtmlService.createHtmlOutput(`
    <div style="font-family:Arial;padding:40px;text-align:center;">
      <h2 style="color:${accent};">${title}</h2>
      <p>${message}</p>
    </div>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**************** UTILITIES ****************/
function getHeaders(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headerRow.forEach((h, i) => map[h] = i + 1);
  return map;
}

function escapeHtml(value) {
  const text = value === null || value === undefined ? "" : value.toString();

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
