/**
 * M5Stack ATOM Echo — push-to-talk voice input.
 *
 * Hold the top button (G39) to record; release to send. Audio streams to
 * /api/atom/speech in apps/web while you speak, which transcribes it and
 * replies with text.
 *
 * Two rules this hardware imposes, which every firmware here must follow:
 *
 *   1. The audio pins are set explicitly below. Board auto-detection reports
 *      type 130 on this unit and the sketch then runs but produces NO sound.
 *   2. The PDM mic and the I2S speaker share pin G33 and the same I2S port, so
 *      they can never be active at once. Always end one before beginning the
 *      other.
 *
 * Why streaming and not one big POST: there is no PSRAM and ~300 KB of RAM, of
 * which Wi-Fi takes 40-50 KB. Buffering the whole clip would cap recording at
 * 3-4 seconds. Streaming 8 KB chunks keeps memory flat whatever the length.
 */
#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>

#include "audio_config.h"
#include "secrets.h"

/** SK6812 RGB LED. M5Unified does not expose it on this board, so it is driven
 *  directly with the core's built-in single-pixel helper. */
static constexpr uint8_t LED_PIN = 27;

/** Recorded into alternately, so a send never stalls the next capture. */
static int16_t chunkA[ATOM_CHUNK_SAMPLES];
static int16_t chunkB[ATOM_CHUNK_SAMPLES];

static constexpr size_t CHUNK_BYTES = ATOM_CHUNK_SAMPLES * sizeof(int16_t);
static constexpr uint32_t MAX_CHUNKS =
    ((uint32_t)ATOM_MAX_SECONDS * ATOM_SAMPLE_RATE) / ATOM_CHUNK_SAMPLES;

// ── LED ──────────────────────────────────────────────────────────────────────

static void led(uint8_t r, uint8_t g, uint8_t b) { rgbLedWrite(LED_PIN, r, g, b); }

static void ledIdle() { led(0, 0, 0); }
static void ledConnecting() { led(0, 0, 40); }   // blue
static void ledRecording() { led(60, 0, 0); }    // red
static void ledSending() { led(60, 35, 0); }     // amber
static void ledOk() { led(0, 50, 0); }           // green
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

/** Short confirmation tone. Speaker only — the mic must already be stopped. */
static void beep(uint16_t hz, uint32_t ms) {
  M5.Speaker.begin();
  M5.Speaker.setVolume(200);
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

// ── Push-to-talk ─────────────────────────────────────────────────────────────

/**
 * Record while the button is held, streaming as we go.
 *
 * Uses HTTP chunked transfer because the length is unknown until the button is
 * released. The server wraps the raw PCM in a WAV header once it has it all.
 */
static bool recordAndSend() {
  if (!ensureWifi()) {
    blinkError();
    return false;
  }

  WiFiClient client;
  // Also bounds the wait for the server's reply, which covers transcription
  // plus several agent tool turns — easily past 10 s. The route allows 60.
  client.setTimeout(45000);
  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.printf("Could not reach %s:%d\n", SERVER_HOST, SERVER_PORT);
    blinkError();
    return false;
  }

  client.printf("POST %s HTTP/1.1\r\n", ATOM_ENDPOINT_PATH);
  client.printf("Host: %s:%d\r\n", SERVER_HOST, SERVER_PORT);
  client.printf("%s: %s\r\n", ATOM_TOKEN_HEADER, DEVICE_TOKEN);
  client.print("Content-Type: application/octet-stream\r\n");
  client.print("Transfer-Encoding: chunked\r\n");
  client.print("Connection: close\r\n\r\n");

  // Speaker off before the mic starts — they share G33 and the I2S port.
  M5.Speaker.end();
  M5.Mic.begin();
  ledRecording();
  Serial.println("Recording...");

  uint32_t chunks = 0;
  bool ok = true;

  while (chunks < MAX_CHUNKS) {
    M5.update();
    if (!M5.BtnA.isPressed()) break;

    int16_t* buf = (chunks % 2 == 0) ? chunkA : chunkB;
    if (!M5.Mic.record(buf, ATOM_CHUNK_SAMPLES, ATOM_SAMPLE_RATE)) {
      ok = false;
      break;
    }
    while (M5.Mic.isRecording()) delay(1);

    // One chunked-encoding frame: size in hex, CRLF, bytes, CRLF.
    client.printf("%x\r\n", (unsigned)CHUNK_BYTES);
    if (client.write((const uint8_t*)buf, CHUNK_BYTES) != CHUNK_BYTES) {
      ok = false;
      break;
    }
    client.print("\r\n");
    chunks++;
  }

  M5.Mic.end();
  client.print("0\r\n\r\n");  // terminating chunk
  ledSending();
  Serial.printf("Sent %lu chunks (%.1f s)\n", (unsigned long)chunks,
                (float)chunks * ATOM_CHUNK_SAMPLES / ATOM_SAMPLE_RATE);

  if (!ok) {
    client.stop();
    blinkError();
    return false;
  }

  String status = client.readStringUntil('\n');
  status.trim();
  Serial.printf("Server: %s\n", status.c_str());
  bool success = status.indexOf(" 200 ") > 0;

  // The server replies with chunked encoding and closes the connection (we
  // sent Connection: close). Headers and body often land in separate TCP
  // segments, so read until the server closes — stopping when the buffer is
  // merely empty for a moment drops the body and prints nothing.
  String body;
  uint32_t start = millis();
  while ((client.connected() || client.available()) && millis() - start < 20000) {
    while (client.available()) body += (char)client.read();
    delay(5);
  }
  client.stop();

  // The chunk-size framing wraps the JSON; print just the object.
  int open = body.indexOf('{');
  int close = body.lastIndexOf('}');
  if (open >= 0 && close > open) {
    Serial.printf("Reply: %s\n", body.substring(open, close + 1).c_str());
  } else {
    Serial.printf("Reply: (no JSON body received, %u bytes)\n", body.length());
  }

  return success;
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

  beep(1000, 200);
  ensureWifi();
  ledIdle();

  Serial.println("Ready. Hold the button to talk.");
}

void loop() {
  M5.update();

  if (M5.BtnA.wasPressed()) {
    bool ok = recordAndSend();

    if (ok) {
      ledOk();
      beep(1400, 120);
      delay(300);
    } else {
      blinkError();
    }
    ledIdle();
    Serial.println("Ready. Hold the button to talk.");
  }

  delay(1);
}
