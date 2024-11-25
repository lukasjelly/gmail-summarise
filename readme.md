# Gmail Summariser Script
This script is used to summarise specified emails in a Gmail account. 

# Pre-requisites
1. A Google Apps Script project
2. An OpenAI API key
3. Permissions to access the Gmail API
4. An email rule that marks the emails to be summarised with a star and a specific label

# Installation
1. Copy the code in `code.gs` and paste it into the script editor in your Google Apps Script project.
2. Replace the `API_KEY` variable with your OpenAI API key.
3. Run the `getSummary` function to test the script.
4. Optionally, set up a trigger to run the script at a specific time.