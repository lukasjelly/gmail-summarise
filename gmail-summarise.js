const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const RESPONSE_EMAIL = PropertiesService.getScriptProperties().getProperty('RESPONSE_EMAIL');
const LABEL_NAME = "AI Summary";
const GEMINI_MODEL = "gemini-2.5-pro";

function CheckForNewEmailToProcess() {
  Logger.log("Searching for threads with label: " + LABEL_NAME);
  var searchQuery = 'label:"' + LABEL_NAME + '"';
  const threads = GmailApp.search(searchQuery);
  Logger.log("Found " + threads.length + " threads.");

  for (const thread of threads) {
    const messages = thread.getMessages();
    Logger.log("Thread subject: " + thread.getFirstMessageSubject() + ", messages: " + messages.length);
    if (messages.length === 0) {
      Logger.log("No messages found in thread with subject: " + thread.getFirstMessageSubject());
      continue;
    }
    for (const message of messages) {
      Logger.log("Processing email with subject: " + message.getSubject());
      processEmail(message);
      thread.removeLabel(GmailApp.getUserLabelByName(LABEL_NAME));
      Logger.log("Removed label '" + LABEL_NAME + "' from thread.");
    }
  }
}

function processEmail(message) {
  Logger.log("Starting processEmail for: " + message.getSubject());
  var fromEmail = message.getFrom();
  var subject = message.getSubject();
  var body = message.getPlainBody();
  var attachment = getFirstPdfAttachment(message);
  var fileUri = null;
  if (attachment) {
    fileUri = uploadPdfAndGetUri(attachment);
    Logger.log("PDF fileUri: " + fileUri);
  } else {
    Logger.log("No PDF attachment found.");
  }
  var summary = getGeminiSummary(fromEmail, subject, body, fileUri);
  Logger.log("Gemini summary received.");
  var formattedSummary = formatSummary(summary);
  Logger.log("Summary formatted.");
  sendSummaryEmail(fromEmail, subject, message.getBody(), formattedSummary, attachment);
}

function getFirstPdfAttachment(message) {
  Logger.log("Checking for PDF attachments...");
  var attachments = message.getAttachments();
  for (var i = 0; i < attachments.length; i++) {
    var att = attachments[i];
    Logger.log("Attachment found: " + att.getName() + ", type: " + att.getContentType());
    if (att.getContentType() === "application/pdf") {
      return att;
    }
  }
  return null;
}

function uploadPdfAndGetUri(att) {
  Logger.log("Uploading PDF: " + att.getName());
  var uploadUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + GEMINI_API_KEY;
  var metadata = {
    "file": { "display_name": att.getName() }
  };
  var uploadHeaders = {
    "X-Goog-Upload-Protocol": "resumable",
    "X-Goog-Upload-Command": "start",
    "X-Goog-Upload-Header-Content-Length": att.getBytes().length,
    "X-Goog-Upload-Header-Content-Type": "application/pdf",
    "Content-Type": "application/json"
  };
  var uploadInitResp = UrlFetchApp.fetch(uploadUrl, {
    method: "post",
    headers: uploadHeaders,
    payload: JSON.stringify(metadata),
    muteHttpExceptions: true
  });
  var headers = uploadInitResp.getHeaders();
  Logger.log("Upload init response headers: " + JSON.stringify(headers));
  var resumableUrl = headers["x-goog-upload-url"] || headers["X-Goog-Upload-URL"];
  Logger.log("Resumable upload URL: " + resumableUrl);
  if (resumableUrl) {
    var uploadResp = UrlFetchApp.fetch(resumableUrl, {
      method: "post",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
      },
      payload: att.getBytes(),
      muteHttpExceptions: true
    });
    var fileInfo = JSON.parse(uploadResp.getContentText());
    Logger.log("PDF uploaded. fileUri: " + fileInfo.file.uri);
    return fileInfo.file.uri;
  } else {
    Logger.log("Failed to get resumable upload URL for PDF.");
    return null;
  }
}

function getGeminiSummary(fromEmail, subject, body, fileUri) {
  Logger.log("Calling Gemini API for summary...");
  var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + GEMINI_API_KEY;
  var parts = [
    { "text": "Summarise the key points of this email." },
    { "text": "From: " + fromEmail },
    { "text": "Subject: " + subject },
    { "text": "Email Body: " + body }
  ];
  if (fileUri) {
    parts.push({
      "file_data": {
        "mime_type": "application/pdf",
        "file_uri": fileUri
      }
    });
    Logger.log("PDF fileUri included in Gemini request.");
  }
  var payload = { "contents": [ { "parts": parts } ] };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch(apiUrl, options);
  Logger.log("Gemini API response received.");
  var responseJson = JSON.parse(response.getContentText());
  return responseJson.candidates[0].content.parts[0].text;
}

function formatSummary(gptResponse) {
  Logger.log("Formatting Gemini response...");
  return gptResponse
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\* (.*?)\n/g, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>");
}

function sendSummaryEmail(fromEmail, subject, originalBody, formattedSummary, attachment) {
  Logger.log("Sending summary email to: " + RESPONSE_EMAIL);
  var emailSubject = "Summary of " + subject;
  var emailBody = "<H1>AI Key Points</H1>" + formattedSummary;
  emailBody += "<H1>Original Email</H1>From: " + fromEmail + "<br>Subject: " + subject + "<br>" + originalBody;
  var mailOptions = {htmlBody: emailBody};
  if (attachment) {
    mailOptions.attachments = [attachment];
    Logger.log("PDF attachment included in summary email: " + attachment.getName());
  }
  GmailApp.sendEmail(RESPONSE_EMAIL, emailSubject, "", mailOptions);
  Logger.log("Email sent to " + RESPONSE_EMAIL + " with subject: " + emailSubject);
}