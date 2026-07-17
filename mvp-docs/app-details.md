App name - MailFlow

My mother who is constantly inundated with her email inbox has asked me to basically make the audiobook app version of an email productivity app.

The prototype should basically:

1. be a nextjs@latest app that she can login to and then add that page to her home screen on her mobile device, where she will mainly use this.

- This app should have a mobile-first design, bust still be responsive for tablet and laptop/desktop usage.
- My preference is mongodb for database solutions

2. Use browser technologies to connect to bluetooth devices, speaker, microphone, etc. as needed
3. Read emails to user sequentially and wait for supported voice commands.

- "Skip"
- "Next"
- "Archive"
- "Delete" -> (Treat as archive)
- "Reply" -> Capture reply message from user, refine as needed.
- "Snooze" -> treat as skip or next

4. We should have some mechanism of a bookmark so the user can store their progress. If they have 1000 emails, they will need to listen to these in multiple sessions. On their second session, we shouldn't have them start from the beginning, they should be able to pick up right where they left off, even if it was several days ago.
