---
title: "1337UP"
date: 2024-11-16
draft: false
description: "1337UP CTF 2024 - Majix"
toc: false
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<h2>🏆  318/1061 -- 700 Points</h2>


| <span class="text-primary-400">**Challange**</span> | <span class="text-primary-400">Type</span> | <span class="text-primary-400">Points</span> | <span class="text-primary-400">Finished</span> |
| --- | --- | --- | --- |
| **Secure Bank** | Rev | 100 | November 16th, 11:55:09 PM |
| **BabyFlow** | Warmup | 50 | November 16th, 8:29:59 PM |
| **Rigged Slot Machine 1** | Warmup | 50 | November 16th, 8:21:55 PM |
| **Trackdown 2** | OSINT | 100 | November 15th, 8:09:06 PM |
| **Trackdown** | OSINT | 100 | November 15th, 7:49:05 PM |
| **Cold Storage** | Mobile | 100 | November 15th, 5:05:44 PM |
| **BioCorp** | Web | 100 | November 15th, 3:16:32 PM |
| **Pizza Paradise** | Web | 100 | November 15th, 2:46:25 PM |

## Writeups

### Cold Storage 🐈

---
<h4>The Initial Roadblock: APK Installation Blues</h4>
Like any eager hacker starting a mobile challenge, I dove straight in trying to install the APK. However, Android had other plans for my evening:

```powershell
adb install .\\cryptovault.apk

Performing Streamed Install
adb: failed to install .\\cryptovault.apk: Failure [INSTALL_PARSE_FAILED_NO_CERTIFICATES: Failed to collect certificates from /data/app/vmdl318868043.tmp/base.apk: Attempt to get length of null array]
```

Ah yes, the classic "where's your signature, buddy?" error. Android, being the responsible platform it is, refuses to run applications without proper signing. It's like trying to enter a fancy restaurant without a tie – you've got to dress the part!

<h4>Making Our APK Presentable</h4>
First things first, we need the Android SDK build tools. Adding them to PATH:

```bash
C:\\Users\\<USER>\\AppData\\Local\\Android\\Sdk\\build-tools\\34.0.0
```

<h4>The Great Decompilation Adventure</h4>

While we could jump straight to signing the APK, experience has taught us that we'll need to decompile it anyway for our investigation. So why not kill two birds with one stone?

Time to crack open this APK like a digital coconut using apktool. For those unfamiliar with apktool, it's like having X-ray vision for Android apps - it lets us peek inside and see what makes them tick!

```bash
apktool d .\\cryptovault.apk
cd cryptovaul
```

- `smali` files (Android's equivalent of assembly code - as fun to read as ancient hieroglyphics!)
- Resource files in `res/`
- The holy grail of Android app analysis: `AndroidManifest.xml`

<h4>Creating Our Own VIP Pass</h4>
Since we can't get in without proper credentials, let's make some! We'll create a signing key that would make any app proud:

```bash
keytool -genkey -v -keystore research.keystore -alias research_key -keyalg RSA -keysize 2048 -validity 10000
```

<h4>Making Everything Pretty (And Aligned)</h4>
Modern Android is picky about its APKs being aligned properly. Think of it as straightening your tie before entering:

```bash
zipalign -p -f -v 4 cryptovault.apk aligned.apk
```

<h4> The Final Touch: Signing Our Masterpiece</h4>

```bash
apksigner sign --ks ./research.keystore ./aligned.apk
```

And voilà! We now have an APK that Android will welcome with open arms.

<h4>Down the Rabbit Hole: Application Analysis 🕵️‍♂️</h4>
You can also drag-and-drop the APK directly into the emulator if you're feeling fancy.

```powershell
adb install aligned.apk
```

{{< figure
    src="/images/ctfs/1337UP2024/vault.webp"
    alt="Description of the image"
    class="full"
>}}

<h4>AndroidManifest.xml</h4>

> https://github.com/skylot/jadx

Diving into the manifest, we find something interesting - or rather, the lack of something interesting. Just one lonely permission:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

At least our cat friend can browse cat memes while guarding the vault!

The manifest revealed a surprisingly minimalist activity structure:

```powershell
<activity android:name="com.example.cryptoVault.MainActivity"> [..] </activity>
```

<h4>Web Assets: Where the Magic Happens</h4>
The real treasure was hidden in Resources/assets/dexopt/www. Inside, we discovered the unlockVault() function, which revealed our feline friend's secret: PIN `7331`.

> It spells ‘1337’, but backwards.. wow!

After entering the correct PIN, we were rewarded with... another puzzle. An encrypted key. Because one layer of security is never enough!

{{< figure
    src="/images/ctfs/1337UP2024/key.webp"
    alt="Description of the image"
    class="full"
>}}

<h4>The Final Boss: Key Decryption 🔐</h4>

The encryption scheme was hidden in an obfuscated `keygen.js` file. After some quality time with a deobfuscator, we uncovered the encryption algorithm:

```jsx
function affineEncrypt(value, multiplier, offset) {
    return (multiplier * value + offset) % 256;
}

function xor(a, b) {
    return a ^ b;
}

...
```

Rather than trying to understand the entire obfuscated mess (life's too short!), ~~Myself~~ ChatGPT wrote a Python script to reverse the operations and retrieve the flag:

```python
def affine_decrypt(value, multiplier, offset):
    for x in range(256):
        if (multiplier * x) % 256 == 1:
            break
    return (x * (value - offset)) % 256

# The encrypted treasure map
encrypted_key_hex = "abf6c8abb5daabc8ab69d7846def17b19c6dae843a6dd7e1b1173ae16db184e0b86dd7c5843ae8dee15f"
encrypted_key_bytes = hex_to_bytes(encrypted_key_hex)

# Magic numbers (because every good crypto needs magic numbers)
multiplier = 9
offset = 7
xor_key = 51

# Let the decryption begin!
decrypted_bytes = [
    affine_decrypt(xor(byte, xor_key), multiplier, offset)
    for byte in encrypted_key_bytes
]
```