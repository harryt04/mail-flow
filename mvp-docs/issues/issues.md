

# Issue 1
I'm experiencing the following nextjs Errors or bugs every time the application starts 'listening' for user's input. 

## Error Type
Console Error

## Error Message
STT token request failed: {}


    at useVoiceSession.useCallback[listen] (src/hooks/useVoiceSession.ts:101:19)

## Code Frame
   99 |         if (!tokenRes.ok) {
  100 |           const payload = await tokenRes.json().catch(() => ({}))
> 101 |           console.error('STT token request failed:', payload)
      |                   ^
  102 |           throw new Error(
  103 |             "Couldn't reach the voice service — use the buttons below.",
  104 |           )

Next.js version: 16.2.10 (Turbopack)



---

# Issue 2


## Error Type
Console Error

## Error Message
Couldn't reach the voice service — use the buttons below.


    at useVoiceSession.useCallback[listen] (src/hooks/useVoiceSession.ts:102:17)

## Code Frame
  100 |           const payload = await tokenRes.json().catch(() => ({}))
  101 |           console.error('STT token request failed:', payload)
> 102 |           throw new Error(
      |                 ^
  103 |             "Couldn't reach the voice service — use the buttons below.",
  104 |           )
  105 |         }

Next.js version: 16.2.10 (Turbopack)

---

# Issue 3


Additionally, I see the following error message in the UI every single time:

Couldn't reach the voice service — use the buttons below.

At no point did the browser ask me for permission to use my microphone. I think we need to take a thorough look at this and make sure its going to work with modern browser microphone requests and permissions. 

---

# Issue 4

If there is an issue with accessing the microphone, the "Listening" icon is still pulsing, which makes me feel like as a user that it is actively listening to me. If the app can't listen to the user, this animation should stop pulsing, and somehow communicate that the microphone is in-fact NOT being listened to. 

---


# Issue 5

Its telling the user "There's more. Say continue or tell me what to do" too often. WHen I'm trying to listen to the body of an email, I don't want to hear this message every sentence. We should make it so that this message is read after every paragraph or logical separation of the content of the email in quesiton. 

--- 

# Issue 6

Only existing labels are supported. If it is possible for us to create new gmail labels via the API, let's support the ability for the user to click on "Move to" and decide to click on a new chip called "New Folder", which will allow them to create the new label, folder as they defined it. 


---

# Issue 7

The cards on the inbox page don't show enough information about each email. The Start Here button looks really ugly with the text wrapped like it is.


--- 

# Issue 8

It doesn't seem to be only looking at my inbox. Its looking at all mail or something. It seems that the spam and promotional emails that normally get filtered out of my inbox are being considered for reading/listening in this app. If this isn't the case, then the sorting isn't matching the Gmail web client. I expect the order of emails in this application to match gmail, that is to say that he newest ones should always be placed first in the list. 

The user needs a way to focus on what to listen to - whether that's only the "Inbox", or all emails with a certain label, etc. The user need the flexibility to consolidate the emails they will actually have to listen to and sort manually. There's a lot of automatic sorting that could be done first, but isn't being done today in our UI. 

---

# Issue 9

For testing, I've been using my own OpenAI key. I'd like to pass these costs on to the user. My app should be free to use, but they should have to pay for their own API key and then supply the API key to me for routing. I'd like to add this to the settings page and a normal part of the onboarding flow. 

As part of this change I'd like to consider moving the haiku agent that cleans up the user's voice input and instead use an OpenAI model like 5.4 mini or something small and reasonable that can clean up the user's punctuation and grammar as it was intended to be said/read. This way, the user will only be required to supply an OpenAI API key, not one for anthropic as well. Multiple API keys could be a dealbreaker for some users. and even though this app is meant for my mother first and going to be free to users, except for the API key that they have to supply.

I'd like to update this repository's readme to that it talks about supplying your own OpenAPI key. 

Let's also add some contribution steps while we are at it. Since this is a FOSS and BYOK application, i'd like to invite public contribution to this application. The intention is for it to be the audiobook app equivalent of an email client, for people to use when they're otherwise occupied with a task, like commuting, chores, yardwork, etc. 

/Users/harry/Documents/git/mail-flow/src/lib/voice/replyCleanup.ts

--- 

# Issue 10

The sidebar items don't feel like they have enough padding or a modern UI. Please look at the example found here: 
https://ui.shadcn.com/docs/components/base/sidebar

When I collapse the sidebar, the icons aren't horizontally cenetered. 

I'd like the profile Avatar and username at the bottom of the sidebar. this will be a clickable menu button that shows settings or account level stuff, or a sign out button. that's the modern experience I'm accustomed to. 

---

# Issue 11

Skip / snooze sound like they should do the same thing, but they probably don't. Where these types of close actions exist, can we add tooltips so that it is clear to the user what clicking on a button actually means? What does the snooze button mean? can we create a setting for that in the settings page so the user can define what "snooze" actually means? Otherwise, its extremely ambigous, and may as well be consolidated with "skip".

---

# Issue 12

The inbox page supprts pagination. That is acceptable. But I would prefer infinite (but lazy loading) scrolling. Is that something we could reasonably and easily add to the inbox page? If the user scrolls to the bottom of the list, start fetching the next 10-20 results. 

Allow the user some controls in order to filter or search the inbox page so that they only have to listen to emails that are relevant to their search or filter query term. 

As I've listened to my "inbox", the vast majority of emails I've listened to have been promotional emails with coupons or limited time offers. Those are emails that I prefer to sort automatically. Perhaps somewhere in the settings page, we can have a checklist of categories of emails to auto-skip, such as promotional or solicitational offers. Then, even if the agent comes across an email that is supposed to be skipped, it can make its own judgement and autoskip that email, then move on to the next email, which won't be a waste of the user's time to listen to. 

---