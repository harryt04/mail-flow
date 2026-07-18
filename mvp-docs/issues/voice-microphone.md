# Voice & Microphone Issues

## Issue 1: STT Token Request Failure

### Error Type
Console Error

### Error Message
```
STT token request failed: {}
```

Occurs at `useVoiceSession.useCallback[listen]` (src/hooks/useVoiceSession.ts:101:19)

### Code Frame
```
 99 |         if (!tokenRes.ok) {
100 |           const payload = await tokenRes.json().catch(() => ({}))
> 101 |           console.error('STT token request failed:', payload)
     |                   ^
102 |           throw new Error(
103 |             "Couldn't reach the voice service — use the buttons below.",
104 |           )
```

Next.js version: 16.2.10 (Turbopack)

---

## Issue 2: Voice Service Unreachable Error

### Error Type
Console Error

### Error Message
```
Couldn't reach the voice service — use the buttons below.
```

Occurs at `useVoiceSession.useCallback[listen]` (src/hooks/useVoiceSession.ts:102:17)

### Code Frame
```
100 |           const payload = await tokenRes.json().catch(() => ({}))
101 |           console.error('STT token request failed:', payload)
> 102 |           throw new Error(
     |                 ^
103 |             "Couldn't reach the voice service — use the buttons below.",
104 |           )
105 |         }
```

Next.js version: 16.2.10 (Turbopack)

---

## Issue 3: Microphone Permission Handling

The error message "Couldn't reach the voice service — use the buttons below." appears in the UI every single time.

At no point did the browser ask for permission to use the microphone. This needs thorough review to ensure compatibility with modern browser microphone requests and permissions.

---

## Issue 4: Listening State Feedback

When there's an issue with accessing the microphone, the "Listening" icon is still pulsing, which creates a false impression that the app is actively listening.

### Required Fix
- Stop the pulsing animation when the microphone is not accessible
- Communicate clearly to the user that the microphone is NOT being listened to

---

## Issue 5: Message Frequency - "Continue" Prompt

The message "There's more. Say continue or tell me what to do" is being read too often.

When listening to the body of an email, this message shouldn't appear after every sentence. Instead, it should appear after every paragraph or logical separation of the email content.

---
