---
title: "Introduction to BLE hacking"
date: 2025-02-10
draft: false
description: "Test"
Sources: [
    https://litum.com/what-is-ble-how-does-ble-work/
]
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

# <i class="fa-brands fa-bluetooth"></i> Bluetooth Low Energy (<span class="text-primary-400">BLE</span>)
- Address the needs of IoT devices
- Low power consumption
- ISM Band (2.4 Ghz)
- 40 Channels (3 advertising)
- Range varies meters to kilometers
- Short bursts of data


## <i class="fa-solid fa-question"></i> How does it work
@TODO

## <i class="fa-solid fa-magnifying-glass"></i> Disovery process
- Advertising packets on the 3 channels
- Different Advertising packets exists
- Generally we get this type of data
  + Device name
  + TX Powerlevel
  + Services (UUID)
  + ID
- Advertising interval
- Peripheral & Centrals (heavy lifting)
- Multiple connections possible to different devices

## <i class="fa-brands fa-connectdevelop"></i> Connection
- Peripheral sends advertising packets
- Central scans for advertising packets
- When it sees those advertising packets it send a connection request to the peripheral
- Peripheral respons with a packet
- Both devices connect

## <i class="fa-solid fa-user"></i> Services <span class="text-primary-400">&</span> Characteristics
- Both define how BLE device organizes and structures data that it exposes
- Characteristics represents a peace of information or data that a BLE dev wants to expose to another dev
- Service is a grouping of 1 or more characteristics (often logical)

---

# nRF528040
- Multiprotocol capable
- BLE, Zigbee, 802.15.4 and more
- 10-20$
- https://www.nordicsemi.com/Products/Development-tools/nRF-Sniffer-for-Bluetooth-LE