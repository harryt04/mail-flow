# Email Organization & Filtering Issues

## Issue 6: Create New Gmail Labels

Currently, only existing labels are supported. Gmail's API allows creating new labels.

### Required Feature
Add support for creating new gmail labels via the API. When a user clicks on "Move to", they should be able to click on a new chip called "New Folder", which will allow them to create a new label/folder as they define it.

---

## Issue 8: Inbox Filtering & Sorting

The app doesn't seem to be filtering correctly. It appears to be looking at all mail instead of just the inbox. Spam and promotional emails that normally get filtered out in the Gmail web client are being included in this app.

### Current Problems
- Sorting doesn't match the Gmail web client (newest emails should appear first)
- No ability to focus on specific email sources (e.g., only "Inbox" or emails with a certain label)

### Required Features
- User needs a way to filter and focus on what to listen to
  - Filter by label (Inbox, Archive, etc.)
  - Sort by date (newest first)
- Consolidate and manually sort emails they'll actually listen to
- UI needs to support automatic sorting/filtering capabilities

---

## Issue 12: Pagination & Inbox Controls

### Current: Pagination
The inbox page currently supports pagination, which is acceptable but not ideal.

### Desired: Infinite Scroll
Support infinite (but lazy loading) scrolling instead. When the user scrolls to the bottom of the list, automatically fetch the next 10-20 results.

### Additional Feature: Filter & Search
Allow users to filter or search the inbox so they only listen to relevant emails.

### Advanced Feature: Auto-Skip Settings
As the user listens, the vast majority of emails tend to be promotional (coupons, limited-time offers, etc.).

- Add a settings page option: a checklist of email categories to auto-skip
  - Examples: promotional, solicitational offers
- When the agent encounters an email matching these categories, it can auto-skip automatically and move to the next email
- This saves the user's time from listening to irrelevant emails

---
