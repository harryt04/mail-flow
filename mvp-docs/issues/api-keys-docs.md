# API Keys & Documentation Issues

## Issue 9: API Key Management & Model Migration

### Background
Currently testing with personal OpenAI key. Need to shift costs to users while keeping the app free-to-use.

### Requirements

1. **User API Key Management**
   - App should be free to use, but users must provide their own OpenAI API key
   - Users supply the API key to the app for routing
   - Add API key management to the settings page
   - Integrate API key input into the onboarding flow

2. **Model Migration: Haiku → OpenAI**
   - Replace the Haiku agent (currently used for cleaning up voice input) with a small, reasonable OpenAI model
   - Suggested: OpenAI model like 5.4 mini or similar
   - Purpose: clean up user's punctuation and grammar from voice input
   
   **Rationale:** This way users only need to provide one API key (OpenAI) instead of multiple (Anthropic + OpenAI), reducing friction. Multiple API keys could be a dealbreaker for some users.

   **Related File:** `/Users/harry/Documents/git/mail-flow/src/lib/voice/replyCleanup.ts`

### Documentation Updates

3. **Update README**
   - Document that users need to supply their own OpenAI API key
   - Explain the BYOK (Bring Your Own Key) model

4. **Add Contribution Guidelines**
   - Add contribution steps and guidelines
   - Position the app as FOSS (Free and Open Source Software) with BYOK
   
   **Vision:** This app is intended as "the audiobook app equivalent of an email client" for people to use when otherwise occupied with tasks like commuting, chores, yardwork, etc. This positions it for public contribution and community engagement.

---
