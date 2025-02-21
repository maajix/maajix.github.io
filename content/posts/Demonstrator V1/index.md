---
title: "Inside Our Car Hacking Demonstrator"
date: 2025-02-21
draft: false
description: "Introduction into Cache Poisoning Attacks"
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">


## <i class="fa-solid fa-house text-primary-400"></i> Introduction
Over the past year, we've developed a cutting-edge car hacking demonstrator primarily for internal training purposes. This platform <span class="text-primary-400">
emulates a real car</span> -- with <span class="text-primary-400">
authentic CAN communication</span> -- and offers a <span class="text-primary-400">
hands-on way to explore automotive vulnerabilities</span>. Through various dashboards, including a speed gauge, attacker view, and defender view, we can <span class="text-primary-400">
simulate attacks and visually observe their consequences in real time</span>.

## <i class="fa-solid fa-car text-primary-400"></i> Background <span class="text-primary-400">&</span> Context

### Why Automotive Cybersecurity Matters
Automotive cybersecurity has become increasingly important as modern vehicles integrate more advanced IT and operational technology systems. With connected cars becoming the norm, vulnerabilities in communication protocols like the CAN bus have the potential to compromise vehicle safety and performance. Our demonstrator was built as an internal training tool to <span class="text-primary-400">bridge the gap between theoretical knowledge and real-world application</span>, allowing us to better understand these vulnerabilities in a controlled environment.

### Overview of the Demonstrator
Our demonstrator is an <span class="text-primary-400">innovative training platform that replicates the behavior of a real car</span>. It is built to simulate the intricate communication that occurs over the CAN bus, ensuring that the <span class="text-primary-400">training experience closely mirrors real-world scenarios</span>. The system includes multiple control units that perform individual tasks, much like those found in an actual vehicle. For example, the demonstrator can execute <span class="text-primary-400">CAN injection attacks</span>, such as speed manipulation, with these actions immediately reflected on the visual dashboards. In addition to the current dashboards which are <span class="text-primary-400">controlled via an Xbox controller</span>, we are planning to incorporate a <span class="text-primary-400">3D simulator</span> alongside the driver dashboard in our upcoming version. This new feature will allow us to <span class="text-primary-400">visualize attack scenarios</span> in even greater detail and provide an even more immersive training experience. Moreover, we plan to integrate various <span class="text-primary-400">hardware accessories</span>, such as an <span class="text-primary-400">OBD2</span> connector, that will allow us to connect real-life diagnostic devices to the demonstrator. This connector will enable us to simulate attacks even closer to reality, further enhancing the authenticity of our training experience.

#### Demonstrator
{{< figure
    src="/images/posts/demonstrator/v1/d1.jpeg"
    alt="Description of the image"
>}}

{{< figure
    src="/images/posts/demonstrator/v1/d2.jpeg"
    alt="Description of the image"
>}}

#### Driver Dashboard
{{< figure
    src="/images/posts/demonstrator/v1/driver.gif"
    alt="Description of the image"
>}}

#### Attacker Dashboard
{{< figure
    src="/images/posts/demonstrator/v1/attack.gif"
    alt="Description of the image"
>}}

#### Defender Dashboard
{{< figure
    src="/images/posts/demonstrator/v1/detect.gif"
    alt="Description of the image"
>}}

## <i class="fa-solid fa-microchip text-primary-400"></i> Architecture and Setup
Although we will not delve into the specific hardware details, it is important to note that our demonstrator mirrors a real car’s architecture. It employs a modular design with <span class="text-primary-400">distinct control units that manage functions like speed regulation and sensor feedback</span>. The system leverages real CAN bus communication protocols to maintain authenticity, and the integrated dashboards provide clear, visual feedback during each phase of an attack. This <span class="text-primary-400">realistic emulation helps our team understand how various vulnerabilities can be exploited and, in turn, how they might be mitigated in real vehicles</span>.

## <i class="fa-solid fa-glasses text-primary-400"></i> Future Outlook and Recommendations
As automotive technology continues to evolve, the sophistication of potential cyberattacks is also expected to increase. Our car hacking <span class="text-primary-400">demonstrator will evolve alongside</span> these emerging threats, ensuring that our training remains relevant and effective. We believe that <span class="text-primary-400">practical, hands-on training is essential for preparing security teams</span> to defend against these threats.

## <i class="fa-solid fa-list-ul text-primary-400"></i> Conclusion
Our car hacking demonstrator stands as a testament to the critical role of practical training in the realm of automotive cybersecurity. By emulating a real car's control systems and leveraging authentic CAN communication, the platform provides a vivid, real-time insight into the mechanics of cyberattacks and the corresponding defensive strategies. We are confident that tools like this are essential for equipping security teams with the knowledge and skills needed to protect the vehicles of tomorrow.

{{< figure
    src="/images/posts/demonstrator/v1/thankyou.jpeg"
    alt="Description of the image"
>}}