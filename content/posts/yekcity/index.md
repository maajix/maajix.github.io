---
title: "When the Lights Go Out: YekCity"
date: 2026-06-24
draft: false
description: "A physical OT security demonstrator that makes cyberattacks visible — when the city goes dark."
tags: ["OT Security", "ICS", "IEC 61850", "SOC"]
---
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

At some point during the demo, the city goes dark.

Not metaphorically. The power plant stops feeding the grid, parts of the model change state, and <span class="text-primary-400">LEDs show the impact immediately</span>.

What would normally hide between protocol messages, packet captures, and SIEM alerts suddenly becomes visible. That moment is the core idea behind <span class="text-primary-400 font-bold">YekCity</span>.

At <span class="text-primary-400">Yekta IT</span>, we built YekCity as a physical OT security demonstrator. It models a small city: a power plant, a substation, consumers, an attacker component, and a SOC environment.

The goal is not only to talk about OT attacks, but to show how they affect a process, how that impact can be detected, and how a response brings the system back to a stable state.

This post gives a more technical look at why the demonstrator is useful. The red line is simple:

> **OT security becomes much easier to understand when the impact is visible.**

{{< figure
    src="/images/posts/yekcity/yekcity_its_2025.jpeg"
    alt="YekCity demonstrator"
>}}

## <i class="fa-solid fa-industry text-primary-400"></i> Why build a physical OT demonstrator?

OT security is hard to train realistically.

In classic IT security we are used to labs, vulnerable machines, test apps, CTFs, and isolated environments. If something breaks, we reset a VM, restore a snapshot, or rebuild the container.

OT systems are different.

Production environments are too critical to experiment with. You do not attack a real substation just to show how a protocol behaves, and you do not trigger failure states in infrastructure that people depend on.

At the same time, pure simulations often miss the part that makes OT security different from many IT scenarios: the <span class="text-primary-400">physical process</span>.

A log entry can tell you that something changed. A SIEM alert can tell you that something suspicious happened. But seeing parts of a city model lose power shows what that change actually <span class="italic">means</span>.

That is the gap YekCity tries to close. It combines real protocols, controlled attack scenarios, visible effects, and SOC telemetry into one demonstrator, connecting the technical event to the physical consequence.

A typical scenario follows the full chain:

1. communication is manipulated,
2. the process state changes,
3. the model shows the impact,
4. the SOC observes the event,
5. response actions bring the system back.

This is where it becomes more than a model. It turns an abstract security discussion into something people can follow from start to finish.

## <i class="fa-solid fa-city text-primary-400"></i> The model: a small city

YekCity represents a simplified city infrastructure: a <span class="text-primary-400">power plant</span>, a <span class="text-primary-400">substation</span>, and <span class="text-primary-400">consumers</span> representing parts of the city, wired so process states can be shown physically.

The city is not only displayed on a screen. LEDs and visible state changes show what is happening. When the power supply is disrupted, the model reflects it. When the system recovers, that becomes visible too.

From a security perspective, the setup has two important sides:

* an <span class="text-primary-400">attacker component</span> for controlled scenarios,
* a <span class="text-primary-400">SOC environment</span> for monitoring, analysis, and response.

This creates two views of the same situation. The first is the physical model — it shows the state of the city. The second is the SOC — it shows telemetry, events, and alerts.

The interesting part is the connection between both. A change in communication affects the process, the process affects the model, and the SOC observes the same scenario from the defender side.

That connection is what makes YekCity useful.

{{< figure
    src="/images/posts/yekcity/yekcity_view_1.jpg"
    alt="YekCity model: power plant, substation, and consumers"
>}}

## <i class="fa-solid fa-network-wired text-primary-400"></i> Real protocols, controlled environment

One important design decision was to use <span class="text-primary-400">real OT communication</span> instead of mocking the whole scenario.

For the power grid scenario, YekCity uses protocols such as <span class="text-primary-400">MMS</span> and <span class="text-primary-400">GOOSE</span> in an <span class="text-primary-400">IEC 61850</span> context. This makes the environment more realistic than a static animation or a pre-recorded dashboard.

> The goal is not to replicate a production system in public detail, and it is not to publish an attack guide — it is to make realistic behavior observable in a controlled, safe demonstrator.

This distinction matters. If everything is mocked, the exercise becomes artificial: the attacker clicks a button, the dashboard changes color, and the audience has to trust that something meaningful happened in between.

YekCity makes that middle part concrete. The communication, the process state, the physical model, and the SOC telemetry are part of the same story.

That makes the scenario easier to understand, especially for people who know IT security but are less familiar with OT environments.

At the same time, there is a clear boundary. Public explanations stay at architecture and concept level.

Details such as packet contents, network layouts, device identifiers, detection logic, or step-by-step attack flows are intentionally <span class="font-bold">not</span> part of this article.

The important point is not how to reproduce a specific attack. It is what happens when cyber activity affects a process.

## <i class="fa-solid fa-bolt text-primary-400"></i> The city goes dark

The easiest way to understand YekCity is through the main demo flow.

An attacker manipulates communication inside the controlled environment. The power plant stops feeding the grid, or the link between generation and distribution is disrupted.

The substation and consumers are affected, and parts of the city lose supply.

In the model, this is visible immediately. The LEDs change state. Parts of the city go dark.

This is the moment where OT security becomes <span class="text-primary-400">tangible</span>.

For people with an IT background, attacks usually live in HTTP requests, log files, shell sessions, memory dumps, database rows, or cloud control planes. The impact can be serious, but it often stays digital.

In OT, the interesting part is that cyber actions can influence <span class="text-primary-400">physical processes</span>.

YekCity is a demonstrator, not a real city — and that is exactly what makes it useful. It gives us a safe environment to show this relationship without touching production infrastructure.

The same event is also visible from the SOC side. Telemetry is collected, events appear in Elastic, and defenders can investigate. Once the scenario is handled, response actions bring the model back to a stable state.

The full loop is what matters:

> **attack → impact → detection → response → recovery**

Many demos focus mainly on the attack. YekCity gets interesting as a full system: not only that something can be disrupted, but how the impact becomes visible, how defenders observe it, and how the system recovers.

{{< figure
    src="/images/posts/yekcity/yekcity_view_2.jpg"
    alt="YekCity model with status LEDs showing the affected city"
>}}

## <i class="fa-solid fa-shield-halved text-primary-400"></i> The SOC perspective

The SOC is a core part of the setup.

A physical attack demo without detection and response would only tell half the story. It might show that something can be disrupted, but not how defenders observe, investigate, and react to it.

In YekCity, telemetry from the scenario is collected and analyzed in an <span class="text-primary-400">Elastic-based</span> environment. Defenders follow the situation from the monitoring side and connect technical events with process behavior.

The SOC view helps answer questions such as:

* What changed in the process?
* Which events appeared before the visible impact?
* Which behavior looks abnormal?
* What needs to be investigated?
* Which response action is required?
* Did the system return to a stable state?

This does not mean OT security is solved by forwarding everything into a SIEM — that would be too simplistic. The point is that monitoring and response need <span class="text-primary-400">realistic context</span>.

For SOC analysts, YekCity shows that an alert can represent more than an isolated technical event — it may be tied to a visible process impact.

For OT-focused teams, it shows how process behavior can be represented as telemetry and investigated from a defender perspective. That shared view is one of the strongest parts of the demonstrator.

## <i class="fa-solid fa-eye text-primary-400"></i> Why visibility matters

The main lesson behind YekCity is simple:

> **OT security becomes easier to understand when the impact is visible.**

A protocol trace alone can feel abstract. A SIEM alert alone can look like any other blue-team exercise. A physical model alone can look like a nice demo object.

The value comes from connecting all layers: <span class="text-primary-400">network activity</span>, process state, physical impact, SOC visibility, and response.

That chain creates context. A message on the network changes a process state. The process state changes the model. The model makes the impact visible. The SOC shows what defenders observe. The response brings the system back.

This also explains why OT security needs a different mindset. Availability, timing, operational context, and process behavior matter a lot.

A technically successful attack is not only about access or code execution. The real question is what changed in the process, and what consequences that change could have.

YekCity also brings together perspectives that are usually separated: attacker, defender, and process — three angles on the same scenario.

For people new to OT security, this lowers the entry barrier. You do not need a deep protocol spec to start. You can start with the scenario:

> The city has power. The communication is manipulated. The process changes. The lights go out. The SOC investigates. The system recovers.

That flow is easy to follow, but it still represents real OT security concepts.

The physical model is not decoration. It is part of the explanation. It creates a shared language between security people, OT people, SOC analysts, and observers who do not know MMS, GOOSE, IEC 61850, or Elastic.

The moment the city goes dark, the conversation changes. It is no longer only about packets or alerts. It becomes a conversation about <span class="text-primary-400">impact</span>.

## <i class="fa-solid fa-flag-checkered text-primary-400"></i> Conclusion

YekCity demonstrates that OT security becomes clearer when impact is visible.

By combining real protocols, a physical model, and SOC monitoring, it shows how cyber activity can affect a process — and how defenders can observe and respond to it.

The most important moment is still the simplest one: the city goes dark.

From there, the discussion changes. It is no longer only about an alert, a packet, or a protocol. It is about impact, detection, response, and recovery.

That is why physical demonstrators are so useful in OT security. They make the invisible visible.
