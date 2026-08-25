---
title: "FortID CTF 2025 Writeup: Document Upload IDOR via target_user"
date: 2025-09-14
draft: false
description: "FortID CTF 2025 writeup: abusing the target_user parameter on the admin upload endpoint to plant files as another user, plus reversing and misc."
tags: ["CTF", "Web", "IDOR", "File Upload", "Reverse Engineering"]
toc: false
---

<h2>🏆 203/553</h2>

[Team](https://ctftime.org/team/364029):
- [SPBMctf](https://x.com/SPBM_Cyberthrt)

### Web
#### Upload docs

<details>

> We’ve come across a rather unusual solution for uploading documentation, and I’ve noticed several odd things about it. Here’s what I know so far: There’s an `/admin?target_user={user_id}` endpoint that simulates what an admin would see on the site. From there, the admin can view target_user the links. There’s also a `/get_flag` endpoint, which appears to work only within the local network. Local port is 5000.

{{< figure
    src="/images/ctfs/FortID/chall.png"
    alt="Description of the image"
>}}

When inspecting the HTML code we can see a obfuscated script:

```js
var J=M;(function(I,E){var V=M;var W=I();while(!![]){try{...
```

After [deobfuscation](https://obf-io.deobfuscate.io/) we got:

```js
var items = document.querySelectorAll("li");
items.forEach((I, E) => {
  document.querySelector("a[data-index=\"" + E.toString() + "\"]").id = document.getElementsByName(E.toString())[0].innerHTML;
});
(function () {
  var I;
  try {
    var E = Function("return (function() {}.constructor(\"return this\")( ));");
    I = E();
  } catch (h) {
    I = window;
  }
  I.setInterval(j, 1000);
})();
let backup = [].filter.constructor("return this")();
const { href } = backup["static/js/effect.js"] || {
  "href": "static/js/effect.js"
};
const script = document.createElement("script");
script.src = href;
document.body.appendChild(script);
```

> https://obf-io.deobfuscate.io/

That means when setting the name to `static/js/effect.js`, the app creates a script with the set link as source. Exploiting this is trivial, by makinng a XHR request to `/get_flag` and sending this to a webhook or collaborator.

</details>

---

### Rev
#### Rev

<details>

Reverse the binary and create a solution script to reverse the steps

```py
steps = """
<><<<>>=<>>=<>>><<>=<>>><><=<><<><=<><<<><=<>>>>=<<>><=<>><<<=<<>>=<>=<><>><=<<>><<<=<>>><>=<>>><<>=<>=<
    ><><>>=<<>><=<>><=<>><=<<>><<=<>><<>=<<>><>=<>=<<>><><=<>><>>>=<>><<><=<>=<><<>><=<<>><=<>>><<>=<>><
    >>>=<>=<><>><=<<>><<<=<>>><>=<>>><<>=<>=<><<<>>=<>>><>=<>><>>>=<>><<><=<<>><><=<>><>>=<<>><=<>><>>>=
    <<>>=<<>><><=<<>><<=<>=<><><=<<>><=<>><<<=<>>><<>=<>><<=<>><><<=<>=<><<<<=<>><>><=<>><=<<>><<<=<>>><
    <>=<<>><<=<<>>=<>><><<=<>><>>=<<>><>=<>>>>>=
""".strip()

res = []
min_v = 0
max_v = 255
for ch in steps:
    mid = (min_v + max_v) // 2
    if ch == '>':
        min_v = mid + 1
    elif ch == '<':
        max_v = mid - 1
    elif ch == '=':
        res.append(mid)
        min_v = 0
        max_v = 255
    else:
        raise ValueError('unexpected char')

print('len steps', len(steps))
print('len flag', len(res))
print('flag bytes', res[:10])
print('flag', bytes(res).decode('utf-8', errors='replace'))
```

</details>

---

### Misc

| Challenge | Category | Value | Time                       |
|-----------|----------|-------|----------------------------|
| Crypto    | Intro    | 100   | September 12th, 3:58:20 PM |
| Web       | Intro    | 100   | September 12th, 2:38:37 PM |
| Info      | Intro    | 100   | September 12th, 2:07:42 PM |
| Discord   | Intro    | 100   | September 12th, 2:04:53 PM |

