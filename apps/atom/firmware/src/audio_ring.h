#pragma once

#include <Arduino.h>

#include <algorithm>
#include <atomic>
#include <cstring>

/**
 * Single-producer, single-consumer ring of PCM16 samples.
 *
 * The mic task writes; the main loop reads. Positions are running totals, so
 * "how far behind is the reader" is a subtraction and rewinding into the
 * recent past (for pre-roll) is just moving the read position back.
 */
template <size_t CAPACITY>
class AudioRing {
 public:
  /** Producer side. Never blocks: a reader that falls behind loses the oldest audio. */
  void write(const int16_t* samples, size_t n) {
    uint32_t h = head_.load(std::memory_order_relaxed);
    size_t at = h % CAPACITY;
    size_t first = std::min(n, CAPACITY - at);
    memcpy(data_ + at, samples, first * sizeof(int16_t));
    memcpy(data_, samples + first, (n - first) * sizeof(int16_t));
    head_.store(h + n, std::memory_order_release);
  }

  /** Drops everything unread. */
  void skipToNow() { tail_ = head_.load(std::memory_order_acquire); }

  /** Moves the read position to `ms` before now (bounded by what's kept). */
  void rewindMs(uint32_t ms, uint32_t sampleRate) {
    uint32_t h = head_.load(std::memory_order_acquire);
    // Leave headroom so the writer can't lap the reader straight away.
    uint32_t back = std::min<uint32_t>((uint64_t)ms * sampleRate / 1000, CAPACITY / 2);
    tail_ = h - std::min(back, h);
  }

  /**
   * Reads exactly `n` samples, waiting up to `timeoutMs` for them. False on
   * timeout (the mic has stopped). If the reader fell a full ring behind, the
   * lost audio is skipped and counted.
   */
  bool read(int16_t* dst, size_t n, uint32_t timeoutMs = 500) {
    uint32_t start = millis();
    uint32_t h;
    while ((h = head_.load(std::memory_order_acquire)) - tail_ < n) {
      if (millis() - start > timeoutMs) return false;
      delay(1);
    }
    if (h - tail_ > CAPACITY - n) {
      overruns_++;
      tail_ = h - (CAPACITY - n);
    }
    size_t at = tail_ % CAPACITY;
    size_t first = std::min(n, CAPACITY - at);
    memcpy(dst, data_ + at, first * sizeof(int16_t));
    memcpy(dst + first, data_, (n - first) * sizeof(int16_t));
    tail_ += n;
    return true;
  }

  uint32_t overruns() const { return overruns_; }

 private:
  int16_t data_[CAPACITY];
  std::atomic<uint32_t> head_{0};
  uint32_t tail_ = 0;
  uint32_t overruns_ = 0;
};
