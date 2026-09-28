# @mediterranea/atom

Firmware for an **M5Stack ATOM Echo** used as a voice-command microphone.

The device records speech and (from Phase 2) sends it to the Next.js app in
`apps/web`, which handles speech-to-text and any reply. **No server code lives
here** — this app is firmware only.

---

## Hardware

| | |
|---|---|
| Device | M5Stack ATOM Echo, 24 × 24 × 17 mm |
| SoC | ESP32-PICO-D4 rev v1.1, dual core 240 MHz, 40 MHz crystal |
| Wireless | Wi-Fi, Bluetooth Classic + BLE |
| Flash | 4 MB embedded |
| RAM | ~320 KB total. **No PSRAM** |
| Speaker | NS4168 I2S amp, 0.5 W (quiet and tinny — that is normal) |
| Microphone | SPM1423 PDM |
| LED | SK6812, one addressable RGB |
| Buttons | Top of the cube = programmable button (G39). Small side button = reset |
| Other | IR LED, Grove port |
| Power/data | USB-C — **must be a data cable**; charge-only cables show no serial port |

### Pin map

| Function | Pin |
|---|---|
| Speaker BCLK | G19 |
| Speaker LRCK / WS | G33 |
| Speaker DATA OUT | G22 |
| Mic PDM CLK | G33 *(shared with speaker WS)* |
| Mic PDM DATA IN | G23 |
| Button | G39 |

---

## Two rules every firmware here must follow

**1. Set the audio pins explicitly.** Board auto-detection reports type `130` on
this unit; with auto-detection alone the sketch runs but produces **no sound**.
`configureAudioPins()` in `firmware.ino` sets them, and must be kept.

**2. The mic and speaker can never run at once.** They share pin G33 *and* the
I2S port. Always `M5.Speaker.end()` before `M5.Mic.begin()`, and `M5.Mic.end()`
before `M5.Speaker.begin()`.

Other gotchas already hit:

- **Upload speed must be 115200.** The board's `UploadSpeed` menu lists
  `1500000` first, which Arduino takes as the default, and uploads at that speed
  fail with *"The chip stopped responding"*. The FQBN in `sketch.yaml` pins
  `UploadSpeed=115200` — do not drop it.
- **Memory.** 3 s at 16 kHz mono int16 = 96 KB, which fits. With no PSRAM,
  anything much longer must be streamed in chunks rather than buffered.
- **The factory firmware has been overwritten** (it was an LED colour-cycle
  demo, not the Bluetooth speaker firmware). The LED staying off is expected —
  the test firmware does not use it.

---

## Install arduino-cli (macOS)

```sh
brew install arduino-cli
arduino-cli version
```

Then, once per machine:

```sh
pnpm --filter @mediterranea/atom fw:setup
```

That installs the pinned versions into the shared Arduino location:

| | |
|---|---|
| Core | `m5stack:esp32` **3.3.9** |
| Libraries | `M5Unified` **0.2.23**, `M5GFX` **0.2.30** |
| FQBN | `m5stack:esp32:m5stack_atom:UploadSpeed=115200` |

These are the versions the Arduino IDE already has on this Mac, so a CLI build
reproduces the build known to work on the device. If the IDE is already set up,
`fw:setup` is a no-op.

`M5GFX` is a dependency of `M5Unified`. The IDE installs it automatically, but
the CLI does not resolve transitive dependencies, so it is pinned explicitly.

### Why not an arduino-cli build profile?

`sketch.yaml` profiles look like the tidier answer, and they do pin versions in
the repo. They also keep a **private copy** of the platform under
`~/Library/Arduino15/internal` — for the M5Stack core that is roughly **5.5 GB
duplicated** on top of the 5.4 GB the IDE already has, because it pulls every
ESP32 variant toolchain including the RISC-V ones this board never uses.

`scripts/setup.sh` pins the same versions against the shared install instead.

---

## Build, flash, monitor

From the repo root:

```sh
pnpm build:atom      # compile
pnpm flash:atom      # upload to the device
pnpm monitor:atom    # serial monitor at 115200 (Ctrl+C to exit)
pnpm dev:atom        # compile, upload, then monitor
```

Or from `apps/atom`:

```sh
pnpm fw:setup        # install pinned core + libraries (once per machine)
pnpm fw:build
pnpm fw:flash
pnpm fw:monitor
pnpm fw:clean
pnpm fw:ports        # list detected boards and ports
```

A successful build reports roughly:

```
Sketch uses 523531 bytes (16%) of program storage space. Maximum is 3145728 bytes.
Global variables use 26680 bytes (8%) of dynamic memory, leaving 301000 bytes
for local variables. Maximum is 327680 bytes.
```

That 301 KB headroom is what the 96 KB record buffer comes out of — worth
watching once Wi-Fi and TLS are added, since those take 40–50 KB of it.

### About the serial port

`scripts/port.sh` resolves the port by matching `/dev/cu.usbserial-*`. macOS
also exposes its own Bluetooth adapters as `/dev/cu.*`, and auto-detection will
happily choose one of those; matching usbserial only keeps it on the real device
without pinning one machine's port.

This unit currently appears as `/dev/cu.usbserial-C952D13AF5`. To override:

```sh
ATOM_PORT=/dev/cu.usbserial-XXXX pnpm fw:flash
```

If no port is found at all, the cable is charge-only — swap it for a data cable.

---

## What the current firmware does

Boot beep, then on each press of the top button: record 3 s at 16 kHz, print the
mic peak level to serial, play the recording back. Confirms speaker, mic and
button together.

Expected serial output:

```
Booting...
Board detected: 130
Ready. Press the button to record 3 seconds.
Recording...
Mic peak level: 4213 (0 = no signal, higher = louder)
Playing back...
Done. Press again to repeat.
```

A peak level of `0` means the mic captured nothing; anything in the thousands is
normal speech at a short distance.

---

## Voice assistant (Phase 2): "Hola Olivia"

Hands-free. The device listens for its wake word **on the device**; nothing
leaves it until the wake word fires.

1. Say **"Hola Olivia"** or **"Hi Olivia"** — the LED turns red. You can go
   straight on with the question in the same breath.
2. Ask, then stop talking. One second of silence ends the question.
3. The answer plays through the speaker (teal).
4. For six seconds afterwards (soft green) it takes a follow-up without the
   wake word. Silence, and it goes back to waiting for "Hola Olivia".

Questions chain into a conversation ("How long is the second one?" works).
Restarting the device, or saying "nueva conversación" / "new conversation",
starts a fresh one.

The button still works:

- **Tap** — same as saying the wake word; during an answer, stops it.
- **Hold** — push-to-talk; release to send.

The mic and speaker share a pin, so it cannot hear you while it speaks: use the
button to cut in.

> Until the "Hola Olivia" model is trained (see **Wake word** below), the
> stock **"Okay Nabu"** model stands in, so everything else can be used and
> tuned now.

### Setup

```sh
cp firmware/secrets.h.example firmware/secrets.h   # then edit it
```

`secrets.h` holds the Wi-Fi credentials, the server host, and the device token.
It is gitignored. `DEVICE_TOKEN` must match `ATOM_DEVICE_TOKEN` in
`apps/web/.env.local`.

Run the web app as usual — `next dev` already listens on all interfaces, so the
device can reach it over Wi-Fi with no extra flags:

```sh
pnpm dev:web
ipconfig getifaddr en0        # put this in SERVER_HOST
```

> The LAN IP changes when the router hands out a new lease, and a stale value
> looks exactly like the device being broken. If it happens often, reserve the
> IP on the router.

### Why streaming rather than one POST

The device has no PSRAM and ~300 KB of RAM; Wi-Fi alone takes ~41 KB of it
(measured: globals go from 26 KB to 67 KB once `WiFi.h` is linked). Buffering a
whole clip would cap recording at 3–4 seconds. Instead it streams 8 KB chunks
using HTTP chunked transfer, so memory is flat no matter how long you hold the
button, and the server — which knows the length once the upload ends — writes
the WAV header.

WebSocket was the other candidate and was rejected: Vercel's serverless
functions do not support WebSocket servers, so it would need a separate
always-on service for no gain here. The reply rides back in the HTTP response,
as raw PCM16 at 16 kHz, played through a ring of three 4 KB buffers with
~0.4 s of prebuffer.

### LED states

| Colour | Meaning |
|---|---|
| Off | Waiting for the wake word |
| Blue | Connecting to Wi-Fi |
| Red | Listening to the question |
| Amber | Thinking (waiting for the answer to start) |
| Teal | Speaking |
| Soft green | Listening for a follow-up (no wake word needed) |
| Red, blinking ×3 | Error |

M5Unified does not expose this board's SK6812, so it is driven directly on G27
with `rgbLedWrite()`, which is built into the ESP32 core — no extra library.

### Server

`apps/web/app/api/atom/speech/route.ts` — Node runtime (Edge will not take a
binary body), shared-token auth compared in constant time, rate limited.

It rejects clips that are too short, too long, or silent **before** opening a
voice session. Each press is one [GPT-Live](https://developers.openai.com/api/docs/guides/live)
session (`apps/web/lib/atom/live-session.ts`): GPT-Live listens and speaks, and
hands anything about appointments, treatments or prices to the same booking
agent the backoffice uses. That agent runs **read-only** here — the write tools
are withheld, since the device has no way to confirm a booking — and names
clients by first name only.

GPT-Live is built for full-duplex calls, not push-to-talk; the header of
`live-session.ts` explains the three adjustments that make it work. After any
GPT-Live update, re-run the end-to-end check from `apps/web`:

```sh
npx tsx scripts/atom-voice-test.ts "What INDIBA treatments do you offer?" "How long is the second one?"
```

Cost is about $0.05 per billed minute: roughly €0.015 for a question that needs
a lookup, less for one answered from the conversation.

### Wake word

Runs on the ESP32 with [microWakeWord](https://github.com/OHF-Voice/micro-wake-word)
models — the same ones ESPHome runs on this exact device.
`firmware/src/wake_word.cpp` is a port of ESPHome's `micro_wake_word` component
to plain Arduino: TensorFlow Lite Micro and its ops come prebuilt in the ESP32
core; the audio front-end (`src/microfrontend`, `src/kissfft`) is vendored from
TensorFlow Lite Micro, Apache-2.0 / BSD. The kissfft sources are named `*_impl.h`
because arduino-cli only copies files with known extensions, and they must not
be compiled on their own (they are included into `kiss_fft_int16.cc`).

**Training "Hola Olivia".** Open `training/train_hola_olivia.ipynb` in Google
Colab (it needs a GPU and ~6 GB of downloads; this Mac has neither to spare) and
follow its first cell. It trains one model that fires on "Hola Olivia" and "Hi
Olivia" but not on "Olivia" alone, from every Spanish Piper voice, 900+ English
voices, and — best of all — real recordings of the team. Then:

```sh
unzip ~/Downloads/hola_olivia.zip -d models/
python3 scripts/embed-model.py models/hola_olivia.json --use
pnpm flash:atom
```

Edit `training/build_notebook.py`, not the notebook, and re-run it.

**Tuning.** `pnpm monitor:atom` prints every 5 s how close the room came to the
wake word (`wake peak x/255`, fires above the manifest's cutoff) and the noise
floor the speech detector has learnt. False triggers: raise
`probability_cutoff` in the model's `.json` and re-embed. Questions cut off
early or never ending: adjust `ATOM_END_SILENCE_MS`, `ATOM_SPEECH_FACTOR` and
`ATOM_MIN_SPEECH_RMS` in `audio_config.h`.

**Memory.** The capture ring (1 s, 32 KB) keeps audio flowing while Wi-Fi
connects, and holds the half-second before the wake word fired, which is sent
with the question. Each model needs ~25–40 KB of arena.

---

## How this fits the monorepo

`apps/atom` is a pnpm workspace package so it can be driven like the other apps,
but it holds **no JavaScript**. Its `build` script is a deliberate no-op message,
matching `apps/mobile`, so `turbo build` stays green without requiring
arduino-cli on every machine or in CI. The firmware scripts are namespaced
`fw:*` so `turbo build`, `turbo lint` and `turbo dev` never invoke them.

`firmware/build/` (compiled output) and `firmware/secrets.h` (Wi-Fi credentials,
device token — Phase 2) are gitignored.

### Layout

```
apps/atom/
├── package.json            fw:* scripts
├── README.md
├── scripts/
│   ├── setup.sh            pinned core + library install
│   ├── fqbn.sh             board + UploadSpeed=115200
│   └── port.sh             resolves /dev/cu.usbserial-*, ATOM_PORT overrides
└── firmware/
    └── firmware.ino        the sketch (Arduino requires the name to match the folder)
```
