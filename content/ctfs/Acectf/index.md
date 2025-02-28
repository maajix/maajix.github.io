---
title: "ACECTF"
date: 2025-02-27
draft: false
description: "Acectf"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<h2>🏆 185/661 -- 2200 points</h2>

| <span class="text-primary-400">**Challenge**</span> | <span class="text-primary-400">**Category**</span> | <span class="text-primary-400">**Value**</span> | <span class="text-primary-400">**Time**</span> |
| --- | --- | --- | --- |
| The Chemistry Of Code | Reverse | 200 | February 27th, 7:37:22 PM |
| Flag-Fetcher | Web Exploitation | 200 | February 27th, 7:13:35 PM |
| Buried Deep | Web Exploitation | 100 | February 27th, 7:09:12 PM |
| Custom Encoding Scheme | Cryptography | 200 | February 27th, 5:46:28 PM |
| Super Secure Encryption | Cryptography | 100 | February 27th, 3:38:49 PM |
| The Mysterious Building | OSINT | 300 | February 27th, 12:33:52 PM |
| Fall of 2022 | OSINT | 100 | February 27th, 11:45:02 AM |
| Significance of Reversing | Reverse | 200 | February 27th, 11:35:15 AM |
| Bucket List | Web Exploitation | 300 | February 27th, 11:06:05 AM |
| Token of Trust | Web Exploitation | 200 | February 27th, 10:47:37 AM |
| Webrypto | Web Exploitation | 200 | February 27th, 10:10:24 AM |


## <span class="text-primary-400">Writeup </span>/ <span class="text-primary-400">Notes</span>

---

### Web 

#### Webcrypto

<details>

```php
<?php
include('flag.php');
highlight_file(__FILE__);

// Check if parameters 'tom' and 'jerry' are not equal
if ($_GET['tom'] != $_GET['jerry']) {
    echo "<br>Parameter 1 Met!<br>";

        if (md5('ACECTF' . $_GET['tom']) == md5('ACECTF' . $_GET['jerry'])) {
        echo $FLAG;  // If the condition is true, print the flag
    }
}
?>
```

We have to find 2 magic hashes (`starting with 0e or 00e`) that have the structure:

```SH
md5('ACECTF'+'RANDOM_1') == md5('ACECTF'+'RANDOM_2')
RANDOM_1 != RANDOM_2
```

I quickly asked claude to generate me a python script that does it *fast*:

<details>

```py
import hashlib
import string
import time
import itertools
import re
import multiprocessing as mp
from tqdm import tqdm

def md5_hash(input_str):
    """Calculate MD5 hash of a string"""
    return hashlib.md5(input_str.encode('utf-8')).hexdigest()

def is_magic_hash(hash_str):
    """Check if a hash starts with '0e' or multiple zeros followed by 'e', then all digits"""
    return bool(re.match(r'^0+e\d+$', hash_str))

def find_magic_hashes(prefix, max_length=5, num_required=2):
    """Find strings that produce magic hashes when appended to the prefix"""
    results = []
    total_attempts = 0
    charset = string.ascii_letters + string.digits
    start_time = time.time()

    print(f"Searching for magic hashes with prefix '{prefix}'...")

    # Process characters in batches for each length
    for length in range(1, max_length + 1):
        if len(results) >= num_required:
            break

        print(f"Trying length {length}...")

        # Generate all possible combinations for this length
        for chars in tqdm(itertools.product(charset, repeat=length),
                          total=len(charset)**length,
                          desc=f"Length {length}",
                          unit="comb"):
            suffix = ''.join(chars)
            test_str = prefix + suffix
            hash_result = md5_hash(test_str)
            total_attempts += 1

            if is_magic_hash(hash_result):
                results.append((test_str, hash_result))
                print(f"\nFound magic hash #{len(results)}: {test_str} -> {hash_result}")

                if len(results) >= num_required:
                    break

        # Show progress after each length
        elapsed = time.time() - start_time
        rate = total_attempts / elapsed if elapsed > 0 else 0
        print(f"Progress: {total_attempts:,} attempts in {elapsed:.2f} seconds ({rate:.1f} hashes/sec)")

    # Show summary
    elapsed = time.time() - start_time
    print(f"\nSearch completed!")
    print(f"Total attempts: {total_attempts:,}")
    print(f"Total time: {elapsed:.2f} seconds")
    print(f"Average speed: {total_attempts / elapsed:.1f} hashes/sec")

    if results:
        print("\nFound magic hashes:")
        for i, (input_str, hash_str) in enumerate(results, 1):
            print(f"{i}. Input: {input_str}")
            print(f"   Hash: {hash_str}")

        if len(results) >= 2:
            print("\nDemonstrating PHP type juggling with these hashes:")
            print("In PHP, these would be considered equal with loose comparison (==)")
            print(f"'{results[0][1]}' == '{results[1][1]}' would return true")
    else:
        print("\nNo magic hashes found. Try increasing max_length.")

    return results

def process_chunk(args):
    """Process a chunk of combinations for parallel execution"""
    prefix, charset, length, chunk_start, chunk_size = args
    results = []
    total = 0

    # Get the specific combinations for this chunk
    combinations = itertools.islice(itertools.product(charset, repeat=length),
                                   chunk_start, chunk_start + chunk_size)

    for chars in combinations:
        suffix = ''.join(chars)
        test_str = prefix + suffix
        hash_result = md5_hash(test_str)
        total += 1

        if is_magic_hash(hash_result):
            results.append((test_str, hash_result))

    return results, total

def find_magic_hashes_parallel(prefix, max_length=5, num_required=2, num_processes=None):
    """Find magic hashes using parallel processing"""
    if num_processes is None:
        num_processes = mp.cpu_count()

    results = []
    total_attempts = 0
    charset = string.ascii_letters + string.digits
    start_time = time.time()

    print(f"Searching for magic hashes with prefix '{prefix}' using {num_processes} processes...")

    for length in range(1, max_length + 1):
        if len(results) >= num_required:
            break

        print(f"Trying length {length}...")

        # Calculate total combinations for this length
        total_combinations = len(charset) ** length

        # Divide work into chunks
        chunk_size = max(1000, total_combinations // (num_processes * 10))
        num_chunks = (total_combinations + chunk_size - 1) // chunk_size

        # Prepare arguments for each chunk
        args_list = [
            (prefix, charset, length, i * chunk_size, min(chunk_size, total_combinations - i * chunk_size))
            for i in range(num_chunks)
        ]

        # Process chunks in parallel
        with mp.Pool(processes=num_processes) as pool:
            with tqdm(total=total_combinations, desc=f"Length {length}", unit="comb") as pbar:
                for chunk_results, chunk_attempts in pool.imap_unordered(process_chunk, args_list):
                    total_attempts += chunk_attempts
                    pbar.update(chunk_attempts)

                    if chunk_results:
                        results.extend(chunk_results)
                        print(f"\nFound magic hash #{len(results)}: {chunk_results[0][0]} -> {chunk_results[0][1]}")

                    if len(results) >= num_required:
                        pool.terminate()
                        break

        # Show progress after each length
        elapsed = time.time() - start_time
        rate = total_attempts / elapsed if elapsed > 0 else 0
        print(f"Progress: {total_attempts:,} attempts in {elapsed:.2f} seconds ({rate:.1f} hashes/sec)")

        if len(results) >= num_required:
            break

    # Show summary
    elapsed = time.time() - start_time
    print(f"\nSearch completed!")
    print(f"Total attempts: {total_attempts:,}")
    print(f"Total time: {elapsed:.2f} seconds")
    print(f"Average speed: {total_attempts / elapsed:.1f} hashes/sec")

    if results:
        print("\nFound magic hashes:")
        for i, (input_str, hash_str) in enumerate(results, 1):
            print(f"{i}. Input: {input_str}")
            print(f"   Hash: {hash_str}")

        if len(results) >= 2:
            print("\nDemonstrating PHP type juggling with these hashes:")
            print("In PHP, these would be considered equal with loose comparison (==)")
            print(f"'{results[0][1]}' == '{results[1][1]}' would return true")
    else:
        print("\nNo magic hashes found. Try increasing max_length.")

    return results

if __name__ == "__main__":
    prefix = "ACECTF"
    # Choose between single-threaded or parallel version
    # For shorter combinations, single-threaded might be faster due to overhead
    # For longer combinations, parallel will be significantly faster

    # Uncomment only one of these:
    # results = find_magic_hashes(prefix, max_length=5, num_required=2)
    results = find_magic_hashes_parallel(prefix, max_length=5, num_required=2)
```
</details>

It gave me `mP6Ra` `QHUsg` and the flag after using these for `?tom=mP6Ra&jerry=QHUsg` `ACECTF{70m_4nd_j3rry_4r3_4ll135}`

</details>




#### Token of Trust
<details>

```
Welcome to the main page!
To log in, visit /login. But remember, POST requests are my love language. 🧡

PS: Don't forget to set your headers for JSON, or I'll just ignore you. 🙃
```

> POST requests are my love language

> Set your headers for JSON

```JSON
# /login
Oops! Wrong approach.
You can't just waltz in here without a proper POST request.

Try sending a JSON payload like this: {"user":"ace","pass":"ctf"}.

Hint: I only care about your request format, not your credentials. 😉
```

> `{"user":"ace","pass":"ctf"}`

> I only care about your request format, not your credentials

```HTTP
POST /login HTTP/1.1
Host: 34.131.133.224:9999
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36
Connection: keep-alive
Content-Type: application/json
Content-Length: 27

{"user":"ace","pass":"ctf"}
```

```HTTP
HTTP/1.1 200 OK
X-Powered-By: Express

{
    "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QifQ.JT3l4_NkVbkQuZpl62b9h8NCZ3cTcypEGZ1lULWR47M"
}
```

```JSON
Headers = {
  "alg": "HS256",
  "typ": "JWT"
}

Payload = {
  "user": "guest"
}

Signature = "JT3l4_NkVbkQuZpl62b9h8NCZ3cTcypEGZ1lULWR47M"
```

```BASH
❯ ffuf -u http://34.131.133.224:9999/FUZZ -w /usr/share/seclists/bbFuzzing/top.txt

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://34.131.133.224:9999/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/bbFuzzing/top.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

robots.txt              [Status: 200, Size: 56, Words: 9, Lines: 1, Duration: 268ms]
:: Progress: [1423/1423] :: Job [1/1] :: 147 req/sec :: Duration: [0:00:10] :: Errors: 0 ::
```

```
Disallow: /flag (But hey, who listens to robots anyway?)
```

```
POST /flag HTTP/1.1
Host: 34.131.133.224:9999
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)
Connection: keep-alive
Content-Type: application/json
Content-Length: 115

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QifQ.JT3l4_NkVbkQuZpl62b9h8NCZ3cTcypEGZ1lULWR47M"}
```

`Sorry, you're not the admin. No flag for you! 😝`

{{< figure src="/images/ctfs/ACECTF/token_of_trust.png" alt="solution">}}

</details>


#### Bucket List
<details>

> [This](https://www.intigriti.com/researchers/blog/hacking-tools/hacking-misconfigured-aws-s3-buckets-a-complete-guide) link from integriti actually helped me a lot since I never actually attacked S3 Buckets before.

{{< figure src="/images/ctfs/ACECTF/s3_bucket.png" alt="solution">}}

Enumerating the bucket for misconfigured permissions:

```BASH
❯ aws s3 ls s3://opening-account-acectf --no-sign-request
                           PRE cry-for-me/
                           PRE fun/
                           PRE l33t-h4x0r/
                           PRE not-the-galf/
                           PRE open-hearts/
                           PRE opening-night/
                           PRE sao-paulo/
                           PRE wake-me-up/
```

Just some more nice cat images:

```
❯ aws s3 ls s3://opening-account-acectf/cry-for-me/bucket/ --no-sign-request
2025-02-21 16:53:21        112 001.png
2025-02-21 16:53:21       4667 008.jpeg
2025-02-21 16:53:21       5514 020.jpeg
2025-02-21 16:53:21        425 025.png
2025-02-21 16:53:22       5736 081.jpeg
```

{{< highlight sh "linenos=true,hl_lines=7" >}}
❯ aws s3 ls s3://opening-account-acectf/cry-for-me/acectf/ --no-sign-request
2025-02-21 16:53:00       5033 002.jpeg
2025-02-21 16:53:00        346 042.png
2025-02-21 16:53:01        785 046.png
2025-02-21 16:53:01        218 049.png
2025-02-21 16:53:01       1880 057.png
2025-02-21 17:03:50         44 secret.txt
{{< /highlight >}}

The secret held a base64 string which was simply the flag:

```
❯ echo QUNFQ1RGezdoM180dzVfMTVfbTE1YzBuZjE2dXIzZH0= | base64 -d
```

`ACECTF{7h3_4w5_15_m15c0nf16ur3d}`

</details>

#### Buried Deep
<details>

After running content discovery via Burpsuite we find the first part of the flag:

{{< figure src="/images/ctfs/ACECTF/burried.png" alt="PDF Stream">}}

`ACECTF{1nf1l7r471ng_7h3_5y573m_`

In the `secret_path` endpoint we convert the morse code to UTF8:
`15_345y_wh3n_y0u_kn0w_wh3r3_`

And lastly on `style.css` we convert from `ROT`
`7h3_53cr3t5_4r3_bur13d}`

`ACECTF{1nf1l7r471ng_7h3_5y573m_15_345y_wh3n_y0u_kn0w_wh3r3_7h3_53cr3t5_4r3_bur13d}`

</details>

#### Flag Fetcher
<details>

Checking the JS fetching code we can find the flag within the array
```JS
const i = Pc(),
    s = [
      "/a",
      "/c",
      "/e",
    ...
```

`ACECTF{r3d1r3ct10n}`
</details>

---

### Reverse
#### Significance of Reversing
<details>

We got a `.png` file which in the hex editor did not reveal any interesting information straight away. When inspecting the strings of the file, we can see that all the strings are litteraly "reversed".

```
~/Downloads
❯ strings Reverseme.png
tnemmoc.
ssb.
atad.
tlp.tog.
cimanyd.
yarra_inif.
yarra_tini.
...
```

Also when inspecting the end of the file in the hex editor we can see `...FLE.`. When "reversing" we can see that this spells `ELF` which is an executable file in linux. So seemingly we have to just reverse this whole `png` file and we will receive an `ELF` executable. I asked claude to quickly generate a python script that does this.

```PYTHOn
def reverse_bytes(input_path, output_path):
    """
    Reverses the order of bytes in a file

    Args:
        input_path (str): Path to the input file
        output_path (str): Path for the output file
    """
    # Read the input file in binary mode
    with open(input_path, 'rb') as input_file:
        data = input_file.read()

    # Reverse the bytes
    reversed_data = data[::-1]

    # Write the reversed data to the output file
    with open(output_path, 'wb') as output_file:
        output_file.write(reversed_data)

    print(f"File reversed and saved to {output_path}")

reverse_bytes('Reverseme.png', 'reversed')
```

```BASH
~/Downloads [🐍 v3.13.1]
❯ chmod +x reverse

~/Downloads [🐍 v3.13.1]
❯ ./reverse
```

`ACECTF{w3_74lk_4b0u7_r3v3r53}`

</details>

#### The Chemistry
<details>

When checking the main file we can see the following interesting params:

```RUST
const FERROUS_OXIDE_USERNAME: &str = "AdminFeroxide";
const ANIONIC_PASSWORD: &str = "NjQzMzcyNzUzNTM3MzE2Njc5MzE2ZTM2";
const ALKALINE_SECRET: &str = "4143454354467B34707072336E373163335F3634322C28010D3461302C392E";
```

When checking the code further it asks for a username and password, where the username can already be seen in the above values. The password was encoded uses base64, so we can just decode it to `643372753537316679316e36`. This looks like ASCII values so lets convert it into a string `d3ru571fy1n6`.

With this we can run the program and it will automatically extract the flag `ACECTF{4ppr3n71c3_w4l73r_wh1t3}`.

```RUST
fn reaction_chamber() {
    ionic_bond("AdminFeroxide", "d3ru571fy1n6");
}
```

</details>

---


### Crypto
#### Super Secure Encryption

<details>

We get 2 seperate text messages 1 beeing the encrypted flag and one being a "test" message. Since the test message was also encrypted using the same `k`, we can simply `XOR` the contents with the encrypted cyphertext and retreive the original `k`. We can then use use `k` to decrypt the actual flag.

<details>

```PY
import binascii

# Known plaintext and ciphertexts
plaintext = b"This is just a test message and can totally be ignored."
test_ciphertext = "d71f4a2fd1f9362c21ad33c7735251d0a671185a1b90ecba27713d350611eb8179ec67ca7052aa8bad60466b83041e6c02dbfee738c2a3"
flag_ciphertext = "c234661fa5d63e627bef28823d052e95f65d59491580edfa1927364a5017be9445fa39986859a3"

# Convert to bytes
test_cipher_bytes = bytes.fromhex(test_ciphertext)
flag_cipher_bytes = bytes.fromhex(flag_ciphertext)

# Extract keystream: keystream = ciphertext XOR plaintext
keystream = b""
for i in range(len(plaintext)):
    keystream += bytes([test_cipher_bytes[i] ^ plaintext[i]])

# Decrypt flag using keystream
flag = b""
for i in range(len(flag_cipher_bytes)):
    flag += bytes([flag_cipher_bytes[i] ^ keystream[i]])

print("Recovered flag:", flag.decode())
```

</details>

`ACECTF{n07h1n6_15_53cur3_1n_7h15_w0rld}`
</details>

#### Custom Encoding Scheme
<details>

```PYTHON
def encode(message, key):
    valid_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

    to_solve = []

    if key is not None and len(key) != 168:
        raise ValueError("Invalid Input")

    # Go in chunks of 4 for the whole key
    # Key is 128 so we have 32 chunks of 4
    if key is not None:
        key_chunks = [key[i:i + 4] for i in range(0, len(key), 4)]

    for index, m in enumerate(message):
        bin_value_of_order_m = f"{ord(m):08b}"

        if index < 42 and key is not None:
            bits_0_to_6 = bin_value_of_order_m[:6]
            bits_6_to_8 = bin_value_of_order_m[6:] + key_chunks[index]

            int_bits_0_to_6 = int(bits_0_to_6, 2)
            int_bits_6_to_8 = int(bits_6_to_8, 2)

            encoding_via_bit_sites = valid_chars[int_bits_0_to_6] + valid_chars[int_bits_6_to_8]
        else:
            bits_0_to_6 = bin_value_of_order_m[:6]
            bits_6_to_8 = bin_value_of_order_m[6:]

            int_bits_0_to_6 = int(bits_0_to_6, 2)
            int_bits_6_to_8 = int(bits_6_to_8, 2)

            encoding_via_bit_sites = valid_chars[int_bits_0_to_6] + valid_chars[int_bits_6_to_8]

        to_solve.append(encoding_via_bit_sites)
    return to_solve

m = "I TOLD YOU THAT BASE64 DECODING IS NO GOOD"
k = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
key_chunks = [k[i:i + 4] for i in range(0, len(k), 4)]

enc_flag = []
with open("output.txt", "r") as f:
    for line in f:
        enc_flag.append(line.strip())

to_solve = encode(message=m, key=k)

print("What it is:\t\t\t", to_solve)
print("What it should be:\t", enc_flag)
print("Key chunks:\t\t\t", key_chunks)

encoding_key = []
for index, chunk in enumerate(key_chunks):
    for i in range(0, 16):
        key_chunks[index] = f"{i:04b}"
        result = encode(m, "".join(key_chunks))
        if result[index] == enc_flag[index]:
            print(f"\nKey for chunk {index} is {i:04b}")
            encoding_key.append(f"{i:04b}")
            continue

    print("\nCurrent Key:", encoding_key)

print("Final key:", "".join(encoding_key))

flag = ""
binary_string = ''.join(encoding_key)

for i in range(0, len(binary_string), 8):
    byte = binary_string[i:i+8]
    flag += chr(int(byte, 2))

print(flag)
```

`ACECTF{7h47_w45_c00l}`
</details>


---

### OSINT
#### Fall of 2022
<details>

When reading the challange, this got my attention: `[..] It seemed like the perfect time to relax and check my phone for her txts.` Since it was an OSINT challange I was pretty sure that this was reffering to DNS `TXT` records so I quickly checked via `https://dnsdumpster.com/` and indeed there was the flag `"ACECTF{y0u_g07_7h3_73x7}"`.

</details>

#### The Mysterious Building
<details>

When inserting the image in Google reverse image search we can find that the tower shown links to an Wikipedia [article](https://de.wikipedia.org/wiki/Fernsehturm_Pitampura#/media/Datei:Pitampura_TV_Tower,_Delhi,_India.jpg). From the surroundings of our image we can also assume that this correlates with the country of `India`.

When checking the possible locations on the map, we can see that only 2 the left and bottom locations are possible standingpoints.

{{< figure src="/images/ctfs/ACECTF/map.png" alt="Map">}}

After checking both the bottom one seemed promissing and I just jumped into streetview where I was placed directly at the location from the Image.

{{< figure src="/images/ctfs/ACECTF/mistery_building.png" alt="Location">}}

{{< figure src="/images/ctfs/ACECTF/pp_trade.png" alt="Solution">}}

`ACECTF{pp_trade_center}`

</details>



