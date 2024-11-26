function CheckForNewEmailToProcess() {
  const threads = GmailApp.search('is:starred label:"AI Summary"');

  for (const thread of threads) {
    const messages = thread.getMessages()

    if (messages.length === 0) {
      console.log("No messages found in thread with subject: " + thread.getFirstMessageSubject());
      continue;
    }

    for (const message of messages) {
      // we know the thread *has* starred messages, but not *all* messages are necessarily starred
      if (message.isStarred()) {
        console.log("Processing email with subject: " + message.getSubject());
        SummariseEmail(message)
        message.unstar()
      }
    }
  }
}

function SummariseEmail(message) {
  var fromEmail = message.getFrom();
  var subject = message.getSubject();
  var body = message.getPlainBody();

  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const GEMINI_MODEL = "gemini-1.5-pro-latest:generateContent";
  var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + "?key=" + GEMINI_API_KEY;
  var prompt = "Give me the key points of this email";
  prompt += "\n\nFrom: " + fromEmail;
  prompt += "\nSubject: " + subject;
  prompt += "\nEmail Body: " + body;
  var payload = {
      "contents": [
          {
              "parts": [
                  {
                      "text": prompt
                  }
              ]
          }
      ]
  }
  var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload)
  };
  var response = UrlFetchApp.fetch(apiUrl, options);
  var responseJson = JSON.parse(response.getContentText());
  var gptResponse = responseJson.candidates[0].content.parts[0].text;
  
  // Format the gptResponse for the email body
  var formattedResponse = gptResponse
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold text
      .replace(/\n\n/g, "<br><br>") // Paragraphs
      .replace(/\* (.*?)\n/g, "<li>$1</li>") // List items
      .replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>"); // Wrap list items in <ul>

  // send a new email with the summary
  var responseEmail = PropertiesService.getScriptProperties().getProperty('RESPONSE_EMAIL');
  var emailSubject = "Summary of " + subject;
  var emailBody = "<H1>AI Key Points</H1>" + formattedResponse;
  emailBody += "<H1>Original Email</H1>From: " + fromEmail + "<br>Subject: " + subject + "<br>" + message.getBody();
  GmailApp.sendEmail(responseEmail, emailSubject, "", {htmlBody: emailBody});
  console.log("Email sent to " + responseEmail + " with subject: " + emailSubject);
}