# Gmail Summariser Script
This script is used to summarise specified emails in a Gmail account. 

# Pre-requisites
1. A Google Apps Script project
2. A Gemini API key
3. Permissions to access the Gmail API
4. An email rule that marks the emails to be summarised with a specified label

# Installation
1. Copy the code in `gmail-summarise` and paste it into the script editor in your Google Apps Script project.
2. In the project properties, set the GEMINI_API_KEY, RESPONSE_EMAIL, and LABEL_NAME variables to the appropriate values.
3. Choose a test email to summarise and add the chosen label to it.
4. Run the `CheckForNewEmailToProcess` function to test the script.
5. If the script runs successfully, you should receive an email with the summary of the test email.
6. Set the script to run on a trigger at a specified interval. It is recommended to run the script every 1 minutes to ensure that the script processes emails in a timely manner once a label is added to an email.