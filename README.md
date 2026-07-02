# 🟢 Phosphor — an oscilloscope glow field guide

> *A phosphor screen doesn't draw a line. It remembers where the beam has*
> *been, and forgets a little slower each moment you're not looking.*

This is a fork of [`soemdsp-sandbox`](https://github.com/soundemote/soemdsp-sandbox)
that gives its **phosphor-style scope renderers** (`lineBurnOscilloscope`,
`scope2d`/`scope2dTrace`, `dotOscilloscope`, `valueOscilloscope`) real
CRT-phosphor grounding: what a phosphor screen physically is, why analog
scopes glow the way they do, how that maps onto this sandbox's `decay`
settings, and where the visual language comes from.

## 🖼️ Gallery: real phosphor oscilloscope demos

Reference gallery of phosphor-oscilloscope photography and captures — CRT
persistence trails, Lissajous burn patterns, vectorscope glow, the whole
"green line that refuses to fully die" aesthetic this fork is chasing:

- 🎞️ **[imgur.com/gallery/design-guide-phosphor-oscilloscope-4kmlxXR](https://imgur.com/gallery/design-guide-phosphor-oscilloscope-4kmlxXR)**

> ⚠️ Imgur isn't reachable from this environment's fetch tooling, so the
> individual images/videos inside that gallery couldn't be enumerated,
> captioned, or embedded directly here — this links to the gallery itself
> rather than guessing at individual media URLs. If you want specific frames
> pulled out and embedded inline (with captions matched to the sections
> below), drop the individual `i.imgur.com` links here and they'll go in.

---

## 📖 Table of contents

- [🖼️ Gallery: real phosphor oscilloscope demos](#️-gallery-real-phosphor-oscilloscope-demos)
- [🕯️ What is a phosphor screen?](#️-what-is-a-phosphor-screen)
- [🧪 The physics in one paragraph](#-the-physics-in-one-paragraph)
- [📐 Anatomy of the glow](#-anatomy-of-the-glow)
- [⏱️ Fluorescence vs. phosphorescence: why the line lingers](#️-fluorescence-vs-phosphorescence-why-the-line-lingers)
- [🎛️ How this maps to the sandbox's scope renderers](#️-how-this-maps-to-the-sandboxs-scope-renderers)
- [🧮 The DSP/render model](#-the-dsprender-model)
- [📊 Common phosphor types (P-series)](#-common-phosphor-types-p-series)
- [📚 References & primary sources](#-references--primary-sources)
- [⚖️ A note on naming & IP](#️-a-note-on-naming--ip)

---

## 🕯️ What is a phosphor screen?

A CRT (cathode-ray tube) oscilloscope screen is coated in **phosphor** — a
crystalline compound that **absorbs energy from an electron beam and
re-emits it as visible light over time**, rather than instantaneously. The
beam sweeps across the screen tracing the signal; the phosphor is what turns
that invisible, momentary electron path into something you can actually
*see* — and, crucially, into something you can still see for a while
*after* the beam has already moved on. 🔦

That lingering is not a flaw being tolerated. It's the entire reason analog
scopes look the way they do: fast-moving parts of a waveform look dim and
thin (the beam barely touched that spot before moving on), slow-moving or
frequently-revisited parts look bright and thick (the phosphor keeps getting
re-excited before it can fully decay). The brightness of every point on the
screen is a *record of dwell time*, not just position.

## 🧪 The physics in one paragraph

Phosphor decay after excitation typically follows something close to an
**exponential falloff**, though real phosphors often show a fast initial
drop followed by a longer "afterglow" tail (a sum of multiple exponential
components, not a single clean one):

```
I(t) = I₀ · e^(−t / τ)
```

where `I₀` is the initial emitted intensity right after the beam passes,
`t` is elapsed time, and `τ` (tau) is the **decay time constant** — how
long it takes brightness to fall to about 37% (1/e) of its initial value.
Different phosphor compounds are engineered for wildly different `τ`,
anywhere from microseconds (fast phosphors for high-refresh digital
readouts) to multiple seconds (long-persistence phosphors built specifically
so a human eye can study a single fast transient event without it vanishing
before you can look at it).

## 📐 Anatomy of the glow

- **Beam** — the electron stream, positioned by deflection plates to trace
  the signal in real time. It's either on (unblanked) or off (blanked)
  moment to moment.
- **Phosphor coating** — the actual light-emitting layer. Its chemistry
  determines color, brightness-per-electron, and decay time.
- **Persistence** — the umbrella term for "how long the trace stays
  visible" — a mix of the phosphor's own decay time *and* how the human
  visual system integrates brief flashes into an apparently-continuous
  glow.
- **Bloom** — bright/fast-moving trace segments visually "spreading" beyond
  their true width, both a real optical effect (light scattering in the
  glass/coating) and a perceptual one (bright things look bigger to the
  eye than they measure).

## ⏱️ Fluorescence vs. phosphorescence: why the line lingers

Two related-but-distinct light-emission mechanisms get lumped together
under "glow-in-the-dark," and CRT phosphors actually rely on a mix of both:

- **Fluorescence** — near-instant re-emission (nanoseconds), stops the
  moment excitation stops. This is what makes the *core* trace sharp and
  bright exactly where the beam currently is.
- **Phosphorescence** — emission continues well after excitation stops
  (milliseconds to seconds+), because the absorbed energy gets trapped in
  metastable electron states before it can radiate. This is the *tail* —
  the part that makes a fast one-shot transient still readable a moment
  after it happened.

A "phosphor look" in a rendered oscilloscope display is really asking for
both effects at once: an instantaneously bright leading edge, and a slower
fading tail behind it.

## 🎛️ How this maps to the sandbox's scope renderers

This sandbox already models this — the scope rendering pipeline
(`node-graph-module-scopes.js`) carries a literal `phosphorFrame` state
object per burn-style scope, and every burn/trace renderer
(`lineBurnOscilloscope`, `scope2d`/`scope2dTrace`, `dotOscilloscope`) has a
`decay` setting (default `0.12`) controlling exactly the `τ` behavior
described above: how much of each frame's brightness survives into the
next, i.e. how "long-persistence" vs. "fast/digital" the trace looks.

- `decay → 0` — no afterglow at all, every frame is drawn fresh. This is
  the "digital storage scope, refresh-rate-limited" look, not a phosphor
  look.
- `decay → 1` — the trace essentially never fades, building up a permanent
  burn-in image over time (useful deliberately for things like Lissajous
  figures or long-exposure-style captures, closer to a genuinely
  long-persistence P7-style phosphor).
- Somewhere in between (the `0.12` default) — the everyday "green scope
  glow" look: fast enough that the display stays legible and current, slow
  enough that motion leaves a visible trail.

## 🧮 The DSP/render model

A minimal per-pixel phosphor model, matching what a `decay`-driven burn
buffer is actually doing each frame:

```
brightness[pixel] = brightness[pixel] * decay + newHit[pixel] * intensity
```

Run every frame, this is a **one-pole IIR lowpass applied to brightness in
the time domain** — the exact same math as an audio one-pole smoothing
filter, just operating on light instead of sound. `decay` closer to 1 =
lower cutoff frequency = slower to respond = longer visual "tail." It's the
same primitive already used all over this sandbox's audio DSP
(`onePoleLowpassSample`, envelope followers, etc.) — phosphor persistence
and an envelope follower's release stage are, mathematically, the same
operation pointed at different data.

## 📊 Common phosphor types (P-series)

Historic scope/CRT phosphors are cataloged by a **P-number**, each tuned
for a different application:

| P-type | Color | Persistence | Typical use |
|--------|-------|-------------|-------------|
| P1 | Green | Medium | General-purpose scopes (the classic "scope green") |
| P4 | White | Medium-short | TV/monitor CRTs |
| P7 | Blue-white → yellow-green afterglow | Long (seconds) | Radar displays, long-persistence storage scopes |
| P11 | Blue | Short | Photographic scope traces (fast film needs a fast, bright flash, not lingering glow) |
| P31 | Green | Short-medium | High-brightness general purpose, later replaced P1 in many designs |

P7 is the one worth calling out specifically for a "beautiful phosphor
glow" aesthetic — it's actually a *two-layer* phosphor (a fast blue-white
layer on top of a slow yellow-green layer beneath), so a single bright
event visibly **changes color as it decays**: bright blue-white at impact,
fading through to a lingering green afterglow. That color-shift-during-decay
effect is a further, tempting rendering target beyond a flat single-hue
`decay` value.

## 📚 References & primary sources

- Tektronix — [Oscilloscope Basics: Reading & Operating Tutorial](https://www.tek.com/en/documents/primer/oscilloscope-basics)
- Tektronix — [Oscilloscope Types](https://www.tek.com/en/documents/primer/oscilloscope-types)
- Tektronix — [Digital Phosphor Oscilloscopes](https://www.tek.com/en/datasheet/digital-phosphor-oscilloscopes)
- Tektronix — [Digital Phosphor Oscilloscope (TDS784D datasheet)](https://www.tek.com/en/datasheet/tds784d)
- Test & Measurement Tips — [Digital phosphor oscilloscopes, persistence, and eye patterns](https://www.testandmeasurementtips.com/digital-phosphor-oscilloscope-persistence-and-eye-patterns-faq/)
- Electronic Design — [Super Phosphor Oscilloscope](https://www.electronicdesign.com/technologies/power/power-supply/power-electronics-systems/article/21197100/super-phosphor-oscilloscope)

## ⚖️ A note on naming & IP

"Phosphor," "P1–P31," and related terminology describe well-documented,
decades-old, industry-standard CRT display technology and are not
proprietary to any single manufacturer. Brand names referenced above
(Tektronix, etc.) are used purely descriptively, to credit primary-source
technical documentation — this fork is **not affiliated with, endorsed by,
or sponsored by** any of the manufacturers or publications linked here.
