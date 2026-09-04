// Grace Encounter 2026 — Google Apps Script registration handler
// Deploy this script as a Web App: Execute as Me; access: Anyone.
// The registration spreadsheet is already created at the ID below.

const SPREADSHEET_ID = '1iqI6v2oppZOU5C3UjuWiWH8kb_ZGWlUNHVbZ8soJn-Y';
const SHEET_NAME = 'Registrations';

function doPost(e) {
  try {
    const data = parsePayload_(e);

    const fullName = clean_(data.full_name);
    const phone = clean_(data.phone);
    const email = clean_(data.email).toLowerCase();

    if (!fullName || !phone || !email) {
      return json_({ ok: false, error: 'Full name, phone number and email are required.' });
    }

    const attendanceType = clean_(data.attendance_type) || 'self';
    const guestCount = attendanceType === 'with-others' ? Math.max(0, Number(data.guest_count || 0)) : 0;
    const totalAttendees = 1 + guestCount;
    const registrationId = clean_(data.registration_id) || createRegistrationId_();
    const updatesConsent = truthy_(data.updates_consent) ? 'Yes' : 'No';

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Registrations sheet was not found.');

    // Prevent accidental duplicate submissions by registration ID.
    if (registrationIdExists_(sheet, registrationId)) {
      return json_({ ok: true, registration_id: registrationId, duplicate: true });
    }

    sheet.appendRow([
      new Date(),
      registrationId,
      fullName,
      phone,
      email,
      clean_(data.age_range),
      clean_(data.location),
      clean_(data.referral_source || data.heard_about),
      attendanceType,
      guestCount,
      totalAttendees,
      updatesConsent,
      'Registered'
    ]);

    sendConfirmationViaResend_({
      email,
      fullName,
      registrationId,
      totalAttendees
    });

    return json_({ ok: true, registration_id: registrationId });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'Registration could not be completed right now.' });
  }
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = String(e.postData.type || '').toLowerCase();
    if (type.indexOf('application/json') !== -1) {
      return JSON.parse(e.postData.contents || '{}');
    }
  }
  return (e && e.parameter) ? e.parameter : {};
}

function registrationIdExists_(sheet, registrationId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return false;
  const values = sheet.getRange(3, 2, lastRow - 2, 1).getDisplayValues();
  return values.some(row => row[0] === registrationId);
}

function createRegistrationId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GE-${stamp}-${random}`;
}

function sendConfirmationViaResend_(registration) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('RESEND_API_KEY');
  const fromEmail = props.getProperty('RESEND_FROM_EMAIL');

  // Registration must still succeed if email is not configured or Resend is temporarily unavailable.
  if (!apiKey || !fromEmail) return;

  const payload = {
    from: fromEmail,
    to: [registration.email],
    subject: 'Grace Encounter 2026 — Registration Confirmed',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152235">
        <h2>Grace Encounter 2026</h2>
        <p>Hello ${escapeHtml_(registration.fullName)},</p>
        <p>Your registration for Grace Encounter has been confirmed.</p>
        <p><strong>Registration ID:</strong> ${escapeHtml_(registration.registrationId)}<br>
        <strong>Expected attendees:</strong> ${registration.totalAttendees}</p>
        <p><strong>Date:</strong> Saturday, 19 September 2026<br>
        <strong>Time:</strong> 9:00 AM – 5:00 PM<br>
        <strong>Venue:</strong> The Fervent Nation, Nyanya, Abuja</p>
        <p>Come boldly. Receive freely.</p>
      </div>`
  };

  try {
    UrlFetchApp.fetch('https://api.resend.com/emails', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${apiKey}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    console.error('Resend confirmation failed', error);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return String(value == null ? '' : value).trim();
}

function truthy_(value) {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on' || value === 'yes' || value === 'Yes';
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
