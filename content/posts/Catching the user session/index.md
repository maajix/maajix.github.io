---
title: "Catching the users session"
date: 2025-08-05
draft: false
description: "Hijacking another user's session through a custom-built cache: mapping the attack surface with an ACL matrix and Auth Analyzer, then serving one user's authenticated response to everyone else."
tags: ["Cache Poisoning", "ACL"]
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

## <i class="fa-solid fa-bars text-primary-400"></i> Overview
In this article, I will describe a vulnerability that I identified during a recent penetration test. The focus is on a cache poisoning attack that resulted from a <span class="text-primary-400">custom caching implementation</span>, combined with additional issues such as <span class="text-primary-400">misconfigured Access Control Lists</span> (ACLs).

## <i class="fa-solid fa-bullseye text-primary-400"></i> ATK surface
When it comes to mapping out the attack surface or identifying vulnerabilities, every security professional has their own preferred tools and methodology. In this article, I will begin by outlining my approach. Specifically, I will detail my process for evaluating Access Control Lists (ACLs), as this step led me to discover the vulnerability.

### ACL Matrix
When assessing authorization and authentication issues, a critical first step is to create a ACL matrix including all the accounts and roles you use in the application. For example, consider the following user-role example assignments:

|   U/R  | Role 1  | Role 2 | Role 3 |        |
|--------|-------- |--------|--------|--------|
| User 1 |  x      |        |        | User   |
| User 2 |         |  x     |        | User   |
| User 3 |         |  x     |  x     | Support|
| User 4 |  x      |  x     |  x     | Admin  |

This matrix indicates, for instance, that `User 1` is assigned to `Role 1`, and so forth. The next step is to test these assignments by verifying whether `User 1` with `Role 1` can perform actions  or access data belonging to `User 2` or `User 3` for each feature the application offers.

> If it makes sense in your application, you can also test for ACL issues on the same role, e.g.`User 1` in `Role 1` tries to access data from `User 2` with `Role 1`.

Example:

| GET SomeFeature | User 1 | User 2 | User 3 |
|-----------------|--------|--------|--------|
| User 1          | x      | ?      | ?      |
| User 2          | ?      | x      | ?      |
| User 3          | ?      | ?      | x      |

Another example closer to reality, suppose the application allows users to manage projects, with each project having a unique identifier. If `User 1` opens their project and intercepts the request, they could attempt to replace their project ID with that of `User 2`'s (assuming we know the ID, since we control both accounts in the test). If the ACL is properly implemented, `User 1` should be denied access to `User 2`’s project, unless it has been explicitly shared.

While this logic is straightforward, identifying such issues can become time-consuming and tedious, especially when dealing with large or unoptimized applications with hundreds of requests to review. For this reason, automating this process is highly desirable. Fortunately, there are established Burp Suite extensions available that can help automate these checks and streamline the workflow.


### Auth Analyzer
Burp Suite includes several plugins for authorization testing, such as Authorize, AuthMatrix, and Auth Analyzer. I prefer <span class="text-primary-400">Auth Analyzer</span> because it’s intuitive and consolidates all necessary features in a single, well-organized interface.

{{< figure
    src="/images/posts/custom_cache/auth_analyzer.png"
    alt="Description of the image"
>}}

To use Auth Analyzer, create separate tabs for each user within the session options and assign the appropriate authorization header (for example, `Cookie: ABC`) to each account. As you browse the target application, <span class="text-primary-400">Auth Analyzer will automatically replay all requests using each session</span>. The tool then displays the result for every request—such as `SAME`, `DIFFERENT`, or `SIMILAR` -- making it straightforward to spot inconsistencies in access control.

However, I always <span class="text-primary-400">review the requests manually</span>, and think about if those request should be allowed or denied for the feature im currently testing.

> As an additional tip, I always <span class="text-primary-400">include an empty user</span> -- meaning a session without any authentication (e.g. `Cookie: InvalidValue`). This helps to identify resources that might be accessible without valid credentials.

## <i class="fa-solid fa-bug text-primary-400"></i> The Vulnerability
While browsing the application and capturing requests in Auth Analyzer, I noticed a server-side caching mechanism in place. Specifically, there was an <span class="text-primary-400">endpoint that accepted JSON data, which appeared to be cached</span> by the server after submission.

{{< highlight http "linenos=true,hl_lines=1 10" >}}
PUT /api/caching/SetCacheItem/bc6481eb-fa2b-4628-9de1-87e7aa7708c5 HTTP/2
Host: redacted.com
Cookie: SomeCookie
Content-Type: application/json

{
    process_steps: [
        ...
    ]
}
{{< /highlight >}}

This behavior using API calls seemed extreamly unusual (looks like a self implemented localstorage of the browser), so I began a more detailed analysis. My first step was to test which <span class="text-primary-400">parameters the caching mechanism was bound to</span> (cache keys) -- that is, to determine how and where the cache was stored or invalidated.

> If you’re interested in cache poisoning, be sure to check out my <span class="text-primary-400">other article</span> on this topic.

{{< article link="/posts/intro-to-cache-poisoning/" showSummary=true compactSummary=true >}}

After some quick tests I found that the cache key is based on a <span class="text-primary-400">unique identifier</span>, such as `/bc6481eb-fa2b-4628-9de1-87e7aa7708c5`. This means that, for a successful attack, one would need to leak or enumerate these UUIDs. For now, let’s continue our enumeration to see if and how this behavior could be exploited.

While exploring additional features, I noticed there were several processes with input fields for user input. Interestingly, <span class="text-primary-400">each time a user entered a character, a caching attempt was triggered</span>.

```HTTP
PUT /api/caching/SetCacheItem/bc6481eb-fa2b-4628-9de1-87e7aa7708c5 HTTP/2
Host: redacted.com
Cookie: SomeCookie
Content-Type: application/json

{... "name": "Hello F", ...}

{... "name": "Hello Fr", ...}

{... "name": "Hello Fro..", ...}
```

{{< figure
    src="/images/posts/custom_cache/example.png"
    alt="Description of the image"
>}}

This indicates that the cache is intentionally <span class="text-primary-400">designed to store user data</span>, so that information is preserved even if a user accidentally refreshes the page or closes their browser. If access control (ACL) on this UUID is missing -- or if developers assume the UUID is unguessable and therefore don’t implement proper ACL -- it could be <span class="text-primary-400">possible to retrieve cached data belonging to other users</span>. This could potentially <span class="text-primary-400">expose sensitive information</span>, such as banking credentials.

Accessing or extracting this data was also very straightforward:

```HTTP
GET /api/caching/GetCacheItem/bc6481eb-fa2b-4628-9de1-87e7aa7708c5 HTTP/2
Host: redacted.com
Cookie: SomeCookie
```


{{< highlight http "linenos=true,hl_lines=9 11-12" >}}
HTTP/2 200 OK
Content-Type: application/json

{
    process_steps: [
        ...
        bank_details: {
            "id": "<some_uuid>",
            "name": "Hello From Other Side",
            "iban": {
                "id": "DE89.."
                "bic": "CO.."
                ...
            }
        }
        ...
    ]
}
{{< /highlight >}}

After quickly reviewing the results in Auth Analyzer, I was genuinely surprised. It revealed that my <span class="text-primary-400">unauthenticated user</span> -- without any cookies or tokens -- was able to both <span class="text-primary-400">set and retrieve data from the cache</span>. This means that if we can obtain a valid UUID, we could not only read the data associated with a user’s session (such as their input), but also <span class="text-primary-400">overwrite it with our own values</span>. These changes would then be reflected in the authenticated user’s session the next time they reload the page.

Since reading from the cache is already trivial with just a valid UUID, let’s focus on how writing works. Assuming we have identified a valid UUID, we can read the cache contents, modify the JSON payload returned by the server, and send it back to update the cached data:

{{< highlight http "linenos=true,hl_lines=1 10" >}}
PUT /api/caching/SetCacheItem/bc6481eb-fa2b-4628-9de1-87e7aa7708c5 HTTP/2
Host: redacted.com
Content-Type: application/json

{
    process_steps: [
        ...
        bank_details: {
            "id": "<some_uuid>",
            "name": "Poisoned Cache Unauthenticated",
            "iban": {
                "id": "DE89.."
                "bic": "CO.."
                ...
            }
        }
        ...
    ]
}
{{< /highlight >}}

After sending the modified data to the cache and reloading my browser, the expected outcome occurred:

{{< figure
    src="/images/posts/custom_cache/poisoned.png"
    alt="Description of the image"
>}}

This is an extremely critical issue, as the integrity of cached data cannot be guaranteed. However, there remains the challenge of obtaining valid UUIDs. To address this, I looked for endpoints that might either leak UUIDs or allow for brute-forcing due to missing rate limiting.

Fortunately, after some investigation, I discovered <span class="text-primary-400">another endpoint that required no authentication</span> at all and, to make matters worse, had <span class="text-primary-400">no rate limiting</span> in place. The response contained some uninteresting information about the instance, however, it only replied this data when the UUID was valid:

```HTTP
GET /api/ProcessInstance/{uuid}/GetActivateUserTask HTTP/2
Host: redacted.com
```

```HTTP
HTTP/2 200 OK
Content-Type: application/json

{
    "id":"some-id-value",
    "assignee":null,
    ...
}
```

In theory, this would allow us to brute-force any UUID in use. However, since the application uses UUIDv4 -- which is designed to be completely random -- this approach is only partially viable. The likelihood of a successful brute-force increases with the number of active users (and thus active UUIDs) on the platform. Despite this limitation, the vulnerability remains extremely critical, and I found the process of discovering and testing it both interesting and enjoyable.
