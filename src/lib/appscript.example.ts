/**
 * Example Google Apps Script backend for Bangue Herutage Bank.
 *
 * Setup:
 * 1. Create a Google Sheet with tabs: TransferOtp, ChatThreads, ChatMessages
 * 2. Extensions → Apps Script → paste a server matching the actions below
 * 3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 * 4. Copy the web app URL into .env as VITE_APP_SCRIPT_URL=
 *
 * Expected sheet headers:
 *
 * TransferOtp:
 *   id | customerId | customerName | customerEmail | accountNumber | to | amount | desc
 *   | stage | codesJson | status | createdAt | updatedAt
 *
 * ChatThreads:
 *   id | visitorId | visitorName | visitorEmail | status | createdAt | updatedAt | lastMessage
 *
 * ChatMessages:
 *   id | threadId | role | senderName | text | createdAt
 *
 * Actions used by this frontend (POST JSON body { action, ... }):
 *   createTransferOtp, getTransferOtp, listTransferOtp,
 *   adminGenerateTransferOtp, verifyTransferOtp, cancelTransferOtp,
 *   chatSend, chatPoll, chatListThreads, chatClose
 *
 * Each response should be: { ok: true, data: ... } or { ok: false, error: "..." }
 */

export const EXAMPLE_APPSCRIPT_ENDPOINT = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

/** Minimal Apps Script skeleton (paste into script.google.com) — reference only */
export const EXAMPLE_APPSCRIPT_CODE = `
function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");
  const action = body.action;
  try {
    let data;
    switch (action) {
      case "createTransferOtp": data = createTransferOtp_(body.session); break;
      case "getTransferOtp": data = getTransferOtp_(body.id); break;
      case "listTransferOtp": data = listTransferOtp_(); break;
      case "adminGenerateTransferOtp": data = adminGenerateTransferOtp_(body.id, body.stage, body.code); break;
      case "verifyTransferOtp": data = verifyTransferOtp_(body.id, body.code); break;
      case "cancelTransferOtp": data = cancelTransferOtp_(body.id); break;
      case "chatSend": data = chatSend_(body); break;
      case "chatPoll": data = chatPoll_(body.threadId, body.afterId); break;
      case "chatListThreads": data = chatListThreads_(); break;
      case "chatClose": data = chatClose_(body.threadId); break;
      default: return json_({ ok: false, error: "Unknown action: " + action });
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Implement helpers to read/write the three sheets.
// Store TransferOtp.codesJson as JSON.stringify(["123456", null, ...]) for 5 stages.
`;
