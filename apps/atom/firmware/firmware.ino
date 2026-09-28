/**
 * M5Stack ATOM Echo — hands-free voice assistant ("Hola Olivia").
 *
 * The device listens for its wake word on-device, the whole time. Say
 * "Hola Olivia" / "Hi Olivia" (or tap the button), ask your question, and stop
 * talking: the question streams to /api/atom/speech in apps/web and the spoken
 * answer streams back and plays on the built-in speaker. For a few seconds
 * afterwards it listens for a follow-up without the wake word.
 *
 * The button still works: hold it to talk (release to send); tap it during an
 * answer to stop it.
 *
 * Privacy: nothing leaves the device until the wake word fires or the button
 * is pressed. Wake word detection runs entirely on the ESP32.
 *
 * Two rules this hardware imposes, which every firmware here must follow:
 *
 *   1. The audio pins are set explicitly below. Board auto-detection reports
 *      type 130 on this unit and the sketch then runs but produces NO sound.
 *   2. The PDM mic and the I2S speaker share pin G33 and the same I2S port, so
 *      they can never be active at once. Always end one before beginning the
 *      other. (It also means the device can't hear you while it speaks — the
 *      button is the way to cut in.)
 *
 * Why streaming and not one big POST: there is no PSRAM and ~300 KB of RAM, of
 * which Wi-Fi takes 40-50 KB. Buffering the whole clip would cap recording at
 * a few seconds. Streaming 2 KB frames keeps memory flat whatever the length.
 */
#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>

#include <atomic>

#include "audio_config.h"
#include "reply_reader.h"
#include "secrets.h"
#include "src/audio_ring.h"
#include "src/mic_stream.h"
#include "src/speech_gate.h"
#include "src/wake_word.h"
#include "wake_words.h"

/** SK6812 RGB LED. M5Unified does not expose it on this board, so it is driven
 *  directly with the core's built-in single-pixel helper. */
static constexpr uint8_t LED_PIN = 27;

// ── State ────────────────────────────────────────────────────────────────────

/** What started a question. */
enum class Trigger {
  WakeWord,  // pre-roll from before detection is sent too
  Button,    // hold: push-to-talk; tap: hands-free
  FollowUp,  // speech started within the follow-up window
};

/** How one question ended. */
enum class Outcome {
  Answered,
  Interrupted,  // button pressed during the answer
  Cancelled,    // nothing was said
  Failed,
};

/** Continuous capture: the mic task fills the ring, the main loop reads it. */
static AudioRing<ATOM_RING_SAMPLES> ring;
static MicStream<ATOM_CAPTURE_SAMPLES> mic;
static std::atomic<bool> micWanted{false};
static std::atomic<bool> micRunning{false};

/** The frame being processed/uploaded. */
static int16_t frame[ATOM_FRAME_SAMPLES];
static constexpr size_t FRAME_BYTES = ATOM_FRAME_SAMPLES * sizeof(int16_t);
static constexpr uint32_t FRAME_MS = ATOM_FRAME_SAMPLES * 1000 / ATOM_SAMPLE_RATE;

static SpeechGate gate(ATOM_SPEECH_FACTOR, ATOM_MIN_SPEECH_RMS);
static WakeWordDetector detector;
static bool wakeWordReady = false;

/** The reply's playback ring. See ATOM_PLAY_SAMPLES in audio_config.h. */
static int16_t playBuf[ATOM_PLAY_BUFFERS][ATOM_PLAY_SAMPLES];
static constexpr size_t PLAY_BYTES = ATOM_PLAY_SAMPLES * sizeof(int16_t);
static constexpr uint8_t PLAY_CHANNEL = 0;

/**
 * Identifies this conversation to the server, which keeps its history. Made
 * fresh at every boot, so restarting the device is how a conversation ends —
 * besides saying "new conversation" / "nueva conversación".
 */
static char sessionId[17];

static void newSession() {
  // esp_random() draws on the hardware RNG, seeded by the radio once Wi-Fi is
  // up; before that it is still unpredictable enough to tell sessions apart.
  snprintf(sessionId, sizeof(sessionId), "%08lx%08lx",
           (unsigned long)esp_random(), (unsigned long)esp_random());
  Serial.printf("New conversation %s\n", sessionId);
}

// ── LED ──────────────────────────────────────────────────────────────────────

static void led(uint8_t r, uint8_t g, uint8_t b) { rgbLedWrite(LED_PIN, r, g, b); }

static void ledIdle() { led(0, 0, 0); }          // off: listening for the wake word
static void ledConnecting() { led(0, 0, 40); }   // blue
static void ledRecording() { led(60, 0, 0); }    // red: listening to the question
static void ledThinking() { led(60, 35, 0); }    // amber
static void ledSpeaking() { led(0, 40, 30); }    // teal
static void ledFollowUp() { led(0, 20, 0); }     // soft green: say more, no wake word needed
static void ledError() { led(80, 0, 0); }        // bright red

static void blinkError() {
  for (int i = 0; i < 3; i++) {
    ledError();
    delay(120);
    ledIdle();
    delay(120);
  }
}

// ── Audio ────────────────────────────────────────────────────────────────────

/** ATOM Echo wiring: NS4168 speaker and SPM1423 PDM mic, sharing G33. */
static void configureAudioPins() {
  M5.Speaker.end();
  auto spk = M5.Speaker.config();
  spk.pin_bck = 19;
  spk.pin_ws = 33;
  spk.pin_data_out = 22;
  spk.i2s_port = I2S_NUM_0;
  M5.Speaker.config(spk);

  auto mic = M5.Mic.config();
  mic.pin_bck = -1;
  mic.pin_ws = 33;       // PDM clock, shared with the speaker's word select
  mic.pin_data_in = 23;  // PDM data
  mic.i2s_port = I2S_NUM_0;
  M5.Mic.config(mic);
}

/**
 * The mic task owns M5.Mic: it starts and stops it on request and otherwise
 * just moves captured audio into the ring. Running it apart from the main loop
 * is what lets audio keep flowing while the loop is blocked on the network.
 */
static void captureTask(void*) {
  for (;;) {
    bool wanted = micWanted.load();
    bool running = micRunning.load();
    if (wanted && !running) {
      mic.begin(ATOM_SAMPLE_RATE);
      micRunning = true;
    } else if (!wanted && running) {
      mic.end();
      micRunning = false;
    }
    if (micRunning) {
      ring.write(mic.next(), ATOM_CAPTURE_SAMPLES);
    } else {
      vTaskDelay(pdMS_TO_TICKS(5));
    }
  }
}

static void micOn() {
  M5.Speaker.end();  // shares G33 and the I2S port with the mic
  micWanted = true;
  while (!micRunning) delay(1);
  ring.skipToNow();
  // The first moments after the PDM mic starts are a thump, not sound.
  delay(120);
  ring.skipToNow();
}

static void micOff() {
  micWanted = false;
  while (micRunning) delay(1);
}

/** Short tone. Turns the mic off to play it; the caller turns it back on. */
static void beep(uint16_t hz, uint32_t ms) {
  micOff();
  M5.Speaker.begin();
  M5.Speaker.setVolume(ATOM_VOLUME);
  M5.Speaker.tone(hz, ms);
  while (M5.Speaker.isPlaying()) delay(1);
  M5.Speaker.end();
}

// ── Wi-Fi ────────────────────────────────────────────────────────────────────

static bool ensureWifi(uint32_t timeoutMs = 15000) {
  if (WiFi.status() == WL_CONNECTED) return true;

  ledConnecting();
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi failed.");
    return false;
  }
  Serial.printf("Wi-Fi up, IP %s\n", WiFi.localIP().toString().c_str());
  return true;
}

// ── Reply playback ───────────────────────────────────────────────────────────

/** Returns true if the user pressed the button, which stops playback at once. */
static bool stopIfPressed() {
  M5.update();
  if (!M5.BtnA.wasPressed()) return false;
  M5.Speaker.stop();
  return true;
}

/**
 * Plays the reply as it streams in.
 *
 * Holds playback until all ATOM_PLAY_BUFFERS are full (~0.4 s), then keeps the
 * ring topped up. playRaw on an explicit channel waits for a free slot, and a
 * slot frees only when the oldest buffer has finished playing — so by the time
 * a buffer comes round to be refilled, it's no longer in use.
 *
 * Returns true if the user interrupted.
 */
static bool playReply(ReplyReader& reply) {
  // The mic must already be off: the speaker takes G33 and the I2S port.
  M5.Speaker.begin();
  M5.Speaker.setVolume(ATOM_VOLUME);

  size_t lens[ATOM_PLAY_BUFFERS] = {0};
  uint32_t filled = 0;
  uint32_t queued = 0;
  uint32_t playedSamples = 0;
  bool speaking = false;
  bool interrupted = false;

  while (true) {
    uint8_t slot = filled % ATOM_PLAY_BUFFERS;
    size_t bytes = reply.read((uint8_t*)playBuf[slot], PLAY_BYTES);
    if (reply.interrupted()) {
      interrupted = true;
      break;
    }
    bool ended = bytes < PLAY_BYTES;
    lens[slot] = bytes / sizeof(int16_t);  // an odd trailing byte is dropped
    if (lens[slot] > 0) filled++;

    if (filled >= ATOM_PLAY_BUFFERS || ended) {
      if (!speaking && filled > 0) {
        ledSpeaking();
        speaking = true;
      }
      while (queued < filled) {
        uint8_t q = queued % ATOM_PLAY_BUFFERS;
        M5.Speaker.playRaw(playBuf[q], lens[q], ATOM_SAMPLE_RATE, false, 1, PLAY_CHANNEL);
        playedSamples += lens[q];
        queued++;
      }
    }

    if (stopIfPressed()) {
      interrupted = true;
      break;
    }
    if (ended) break;
  }

  // Let the last buffers finish, unless the user cuts in.
  while (!interrupted && M5.Speaker.isPlaying(PLAY_CHANNEL)) {
    if (stopIfPressed()) interrupted = true;
    delay(5);
  }

  M5.Speaker.stop();
  M5.Speaker.end();
  if (reply.timedOut()) Serial.println("Reply stream stalled; gave up.");
  Serial.printf("Played %.1f s%s\n", (float)playedSamples / ATOM_SAMPLE_RATE,
                interrupted ? " (interrupted)" : "");
  return interrupted;
}

// ── One question ─────────────────────────────────────────────────────────────

/**
 * Streams a question to the server and plays the answer.
 *
 * The mic is already running. Audio is read from the ring — including a little
 * from before the trigger — and uploaded with HTTP chunked transfer as it's
 * read, until the person stops talking (or lets go of the button).
 */
static Outcome ask(Trigger trigger) {
  ledRecording();
  if (trigger == Trigger::WakeWord) ring.rewindMs(ATOM_PREROLL_MS, ATOM_SAMPLE_RATE);
  if (trigger == Trigger::FollowUp) ring.rewindMs(ATOM_ONSET_MS, ATOM_SAMPLE_RATE);
  uint32_t started = millis();

  // Audio keeps collecting in the ring while this connects.
  if (!ensureWifi()) return Outcome::Failed;
  ledRecording();
  WiFiClient client;
  client.setTimeout(10000);
  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.printf("Could not reach %s:%d\n", SERVER_HOST, SERVER_PORT);
    return Outcome::Failed;
  }

  client.printf("POST %s HTTP/1.1\r\n", ATOM_ENDPOINT_PATH);
  client.printf("Host: %s:%d\r\n", SERVER_HOST, SERVER_PORT);
  client.printf("%s: %s\r\n", ATOM_TOKEN_HEADER, DEVICE_TOKEN);
  client.printf("%s: %s\r\n", ATOM_SESSION_HEADER, sessionId);
  client.print("Content-Type: application/octet-stream\r\n");
  client.print("Transfer-Encoding: chunked\r\n");
  client.print("Connection: close\r\n\r\n");

  // Button: held past ATOM_PTT_HOLD_MS it's push-to-talk and release ends the
  // question; a shorter tap makes it hands-free, like the wake word.
  bool pushToTalk = false;
  bool buttonDown = trigger == Trigger::Button;

  bool heardSpeech = trigger == Trigger::FollowUp;  // that's how it started
  uint32_t lastSpeechAt = millis();
  uint32_t frames = 0;
  uint32_t speechFrames = 0;
  const uint32_t maxFrames = (uint32_t)ATOM_MAX_SECONDS * 1000 / FRAME_MS;
  bool ok = true;

  Serial.println(trigger == Trigger::WakeWord   ? "Listening (wake word)..."
                 : trigger == Trigger::FollowUp ? "Listening (follow-up)..."
                                                : "Listening (button)...");

  while (frames < maxFrames) {
    if (!ring.read(frame, ATOM_FRAME_SAMPLES)) {
      ok = false;
      break;
    }

    client.printf("%x\r\n", (unsigned)FRAME_BYTES);
    if (client.write((const uint8_t*)frame, FRAME_BYTES) != FRAME_BYTES) {
      ok = false;
      break;
    }
    client.print("\r\n");
    frames++;

    if (gate.isSpeech(frame, ATOM_FRAME_SAMPLES)) {
      heardSpeech = true;
      speechFrames++;
      lastSpeechAt = millis();
    }

    M5.update();
    if (buttonDown) {
      if (M5.BtnA.isPressed()) {
        if (!pushToTalk && millis() - started >= ATOM_PTT_HOLD_MS) pushToTalk = true;
      } else {
        buttonDown = false;
        if (pushToTalk) break;  // released: send
      }
    } else if (M5.BtnA.wasPressed()) {
      break;  // a tap while talking hands-free means "that's it"
    }
    if (pushToTalk) continue;

    if (heardSpeech && millis() - lastSpeechAt >= ATOM_END_SILENCE_MS) break;
    if (!heardSpeech && millis() - started >= ATOM_NO_SPEECH_MS) break;
  }

  float seconds = (float)frames * FRAME_MS / 1000.0f;
  bool saidSomething = pushToTalk || speechFrames * FRAME_MS >= ATOM_MIN_SECONDS * 1000;
  if (!ok) {
    client.stop();
    return Outcome::Failed;
  }
  if (!saidSomething) {
    // Wake word with nothing after it, or a tap. Hang up; nothing to ask.
    client.stop();
    Serial.println("Nothing said.");
    return Outcome::Cancelled;
  }

  client.print("0\r\n\r\n");  // terminating chunk
  micOff();
  ledThinking();
  Serial.printf("Sent %.1f s (floor %.0f, threshold %.0f)\n", seconds, gate.floor(), gate.threshold());

  ReplyReader reply(client);
  if (!reply.readHeaders()) {
    client.stop();
    if (reply.interrupted()) return Outcome::Interrupted;
    Serial.println("No response from server.");
    return Outcome::Failed;
  }

  if (reply.status() != 200) {
    // Errors are short JSON, e.g. {"error":"No speech detected"}.
    char body[257];
    size_t n = reply.read((uint8_t*)body, sizeof(body) - 1);
    body[n] = '\0';
    Serial.printf("Error: %s\n", body);
    client.stop();
    return Outcome::Failed;
  }

  // Hanging up mid-answer tells the server to end the voice session.
  bool interrupted = playReply(reply);
  client.stop();
  return interrupted ? Outcome::Interrupted : Outcome::Answered;
}

/**
 * After an answer: listen briefly for more without the wake word. Returns the
 * trigger for the next question, or false to go back to waiting for the wake
 * word.
 */
static bool awaitFollowUp(Trigger* next) {
  if (ATOM_FOLLOW_UP_MS == 0) return false;
  ledFollowUp();
  uint32_t start = millis();
  uint8_t loud = 0;
  while (millis() - start < ATOM_FOLLOW_UP_MS) {
    if (!ring.read(frame, ATOM_FRAME_SAMPLES)) return false;
    // Two loud frames in a row (~130 ms) — a word, not a clink or a cough.
    loud = gate.isSpeech(frame, ATOM_FRAME_SAMPLES) ? loud + 1 : 0;
    if (loud >= 2) {
      *next = Trigger::FollowUp;
      return true;
    }
    M5.update();
    if (M5.BtnA.wasPressed()) {
      *next = Trigger::Button;
      return true;
    }
  }
  return false;
}

/** A whole exchange: the question, its answer, and any follow-ups. */
static void converse(Trigger trigger) {
  for (;;) {
    Outcome outcome = ask(trigger);
    if (!micRunning) micOn();  // back to listening after the speaker

    if (outcome == Outcome::Failed) {
      blinkError();
      break;
    }
    if (outcome == Outcome::Cancelled) break;
    if (outcome == Outcome::Interrupted) {
      // The press that stopped the answer may be a hold: take the question.
      trigger = Trigger::Button;
      continue;
    }
    if (!awaitFollowUp(&trigger)) break;
  }

  // Forget everything heard during the exchange before listening for the
  // wake word again, so the answer's echo in the room can't trigger it.
  ring.skipToNow();
  if (wakeWordReady) detector.reset();
  ledIdle();
  Serial.println(wakeWordReady ? "Ready. Say \"" WAKE_WORD_NAMES "\" or tap the button."
                               : "Ready. Tap or hold the button to talk.");
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("Booting...");

  auto cfg = M5.config();
  cfg.fallback_board = m5::board_t::board_M5AtomEcho;
  M5.begin(cfg);
  Serial.printf("Board detected: %d\n", (int)M5.getBoard());

  configureAudioPins();
  ledIdle();
  newSession();

  // Load the wake word models before Wi-Fi takes its share of the heap.
  wakeWordReady = detector.begin(WAKE_WORD_MODELS, WAKE_WORD_MODEL_COUNT);
  Serial.printf("Wake word %s; free heap %u bytes\n", wakeWordReady ? "ready" : "UNAVAILABLE (button only)",
                (unsigned)ESP.getFreeHeap());

  beep(1000, 200);
  ensureWifi();
  ledIdle();

  // Same core as loop(), higher priority: it mostly sleeps inside record().
  xTaskCreatePinnedToCore(captureTask, "capture", 4096, nullptr, 3, nullptr, 1);
  micOn();

  Serial.println(wakeWordReady ? "Ready. Say \"" WAKE_WORD_NAMES "\" or tap the button."
                               : "Ready. Tap or hold the button to talk.");
}

void loop() {
  if (!ring.read(frame, ATOM_FRAME_SAMPLES)) {
    Serial.println("Mic stopped delivering audio; restarting it.");
    micOff();
    micOn();
    return;
  }

  // Learn the room's noise floor while idle, so questions end at the right time.
  gate.isSpeech(frame, ATOM_FRAME_SAMPLES);

  M5.update();
  if (M5.BtnA.wasPressed()) {
    converse(Trigger::Button);
    return;
  }

  if (wakeWordReady) {
    const WakeWordModel* heard = detector.feed(frame, ATOM_FRAME_SAMPLES);
    if (heard) {
      Serial.printf("Wake word: %s\n", heard->wakeWord);
      converse(Trigger::WakeWord);
      return;
    }
  }

  // A heartbeat for tuning: how close the room came to firing, and its noise.
  static uint32_t lastReport = 0;
  if (millis() - lastReport > 5000) {
    lastReport = millis();
    Serial.printf("[idle] wake peak %u/255, rms %.0f, floor %.0f, overruns %u\n",
                  wakeWordReady ? detector.takePeakProbability() : 0, gate.lastRms(), gate.floor(),
                  (unsigned)ring.overruns());
  }
}
