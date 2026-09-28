#pragma once

#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>

/** Longest gap in the reply stream before giving up. The server streams
 *  continuously (silence while the agent looks things up), so this is only hit
 *  if the connection has quietly died. */
static constexpr uint32_t REPLY_GAP_TIMEOUT_MS = 20000;

/**
 * Reads the HTTP response: status, headers, then the body — decoding chunked
 * transfer encoding if the server uses it (Next.js does for streamed bodies).
 *
 * Every wait for data also watches the button, so a press is noticed even
 * while the server is still thinking.
 */
class ReplyReader {
 public:
  explicit ReplyReader(WiFiClient& client) : c_(client) {}

  bool readHeaders() {
    String line;
    if (!readLine(line)) return false;
    Serial.printf("Server: %s\n", line.c_str());
    int space = line.indexOf(' ');
    status_ = space > 0 ? line.substring(space + 1).toInt() : 0;

    while (readLine(line)) {
      if (line.length() == 0) return true;  // end of headers
      line.toLowerCase();
      if (line.startsWith("transfer-encoding:") && line.indexOf("chunked") > 0) chunked_ = true;
      if (line.startsWith("content-length:")) contentLeft_ = line.substring(15).toInt();
    }
    return false;
  }

  /** Fills `dst` with up to `max` body bytes; fewer means the body ended. */
  size_t read(uint8_t* dst, size_t max) {
    size_t got = 0;
    while (got < max && !done_) {
      if (chunked_ && chunkLeft_ == 0) {
        String line;
        // Each chunk's data is followed by a CRLF before the next size line.
        if (sawChunk_ && !readLine(line)) break;
        if (!readLine(line)) break;
        chunkLeft_ = strtoul(line.c_str(), nullptr, 16);
        sawChunk_ = true;
        if (chunkLeft_ == 0) {
          done_ = true;
          break;
        }
      }

      size_t want = max - got;
      if (chunked_ && chunkLeft_ < want) want = chunkLeft_;
      if (contentLeft_ >= 0 && (size_t)contentLeft_ < want) want = contentLeft_;
      if (want == 0) {
        done_ = true;
        break;
      }

      if (!waitForData()) break;
      size_t avail = c_.available();
      int n = c_.read(dst + got, want < avail ? want : avail);
      if (n <= 0) continue;
      got += n;
      if (chunked_) chunkLeft_ -= n;
      if (contentLeft_ >= 0) contentLeft_ -= n;
    }
    return got;
  }

  int status() const { return status_; }
  bool interrupted() const { return interrupted_; }
  bool timedOut() const { return timedOut_; }

 private:
  /** Waits for the next byte. False at close, timeout or a button press. */
  bool waitForData() {
    uint32_t start = millis();
    while (!c_.available()) {
      if (!c_.connected()) return finish();
      M5.update();
      if (M5.BtnA.wasPressed()) {
        interrupted_ = true;
        return finish();
      }
      if (millis() - start > REPLY_GAP_TIMEOUT_MS) {
        timedOut_ = true;
        return finish();
      }
      delay(2);
    }
    return true;
  }

  bool finish() {
    done_ = true;
    return false;
  }

  bool readLine(String& out) {
    out = "";
    while (true) {
      if (!waitForData()) return false;
      char ch = (char)c_.read();
      if (ch == '\n') return true;
      if (ch != '\r') out += ch;
      if (out.length() > 512) return false;  // not HTTP; don't grow forever
    }
  }

  WiFiClient& c_;
  int status_ = 0;
  bool chunked_ = false;
  bool sawChunk_ = false;
  size_t chunkLeft_ = 0;
  long contentLeft_ = -1;  // -1: unknown, read until close
  bool done_ = false;
  bool interrupted_ = false;
  bool timedOut_ = false;
};
