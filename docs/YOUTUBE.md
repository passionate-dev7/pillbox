# YouTube upload: Pill Round demo

**Video URL:** https://youtu.be/4CB9YBwLf7c

- Title: `Pill Round: a caregiver and a pharmacist, each with an agent on one med list (WebMCP, openFDA)`
  (trimmed from the requested title to fit YouTube's 100-character title limit; the requested title was 101 characters)
- Visibility: Public
- Audience: Not made for kids
- Uploaded file: `/Users/kamal/Desktop/devpost/projects/webmcp/pill-round/video/out/pill-round-demo.mp4` (122s, 1080p)
- Channel: Kamal Nayan Singh (studio.youtube.com, `deepsurge` browser profile)
- Published: Sep 4, 2026

## Description (as pasted)

```
Pill Round is a shared medication list for a caregiver and a pharmacist, each with an agent on the same page, holding different tools. Every flag it raises carries the verbatim sentence from the FDA label that caused it, with the label's set ID.

Live: https://pill-round.vercel.app
Code (MIT): https://github.com/kamalbuilds/pill-round

Built for The WebMCP Challenge.

Data: openFDA drug label, drug/ndc, and drug/enforcement APIs.
```

## Verification evidence

1. YouTube Studio "Video published" confirmation dialog shown after clicking Publish, with share links and video link `https://youtu.be/4CB9YBwLf7c`.
2. Opened the video URL directly in `deepsurge`: page title rendered as
   `Pill Round: a caregiver and a pharmacist, each with an agent on one med list (WebMCP, openFDA) - YouTube`,
   no private/unavailable message.
3. oEmbed check (only succeeds for public videos):
   ```
   curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/oembed?url=https://youtu.be/4CB9YBwLf7c"
   -> 200
   ```
   Full oEmbed response returned `title`, `author_name: Kamal Nayan Singh`, `provider_name: YouTube`, confirming public accessibility.

## Notes

- File selection for the upload dialog was done via CDP `DOM.setFileInputFiles` against the `input[type=file]`
  found by walking shadow roots (`bh-multi run deepsurge` with `Runtime.evaluate` to get an `objectId` for the
  input, then `cdp('DOM.setFileInputFiles', objectId=..., files=[...])`), since `bhn eval` cannot set file inputs
  and `DOM.querySelector` with `pierce=True` did not resolve the shadow-DOM-nested input by selector.
- Title/description fields in YouTube Studio are `contenteditable` divs (`#textbox`, also inside shadow roots);
  text was located by walking shadow roots for `#textbox` elements, then inserted via
  `document.execCommand('insertText', ...)` with the payload base64-encoded and decoded in-page to avoid the
  harness's JS string-escaping trap.
- The `deepsurge` browser profile is shared with a sibling video agent working on `out-of-service` in parallel;
  the browser's active-tab pointer shifted mid-task more than once as the sibling agent drove its own tabs.
  Recovered each time by re-fetching `list_tabs()`, re-`switch_tab()`-ing to this task's own studio tab, and
  issuing the next action in the same `bh-multi run` call as the switch so no other agent's action could land
  in between.