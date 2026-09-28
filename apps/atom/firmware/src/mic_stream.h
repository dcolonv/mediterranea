#pragma once

#include <M5Unified.h>

/**
 * Continuous, gap-free capture from the PDM mic.
 *
 * M5Unified holds at most two record() requests and captures queued requests
 * back to back. With three buffers, two are always queued while the caller
 * works on the third; record() on a full queue waits until the oldest request
 * completes, which is exactly when that buffer is ready to hand out.
 */
template <size_t SAMPLES>
class MicStream {
 public:
  static constexpr size_t samples = SAMPLES;

  void begin(uint32_t sampleRate) {
    rate_ = sampleRate;
    M5.Mic.begin();
    M5.Mic.record(buf_[0], SAMPLES, rate_);
    M5.Mic.record(buf_[1], SAMPLES, rate_);
    next_ = 2;
    running_ = true;
  }

  /**
   * Blocks until the next SAMPLES samples are captured and returns them. The
   * buffer stays valid until the following call.
   */
  const int16_t* next() {
    M5.Mic.record(buf_[next_ % 3], SAMPLES, rate_);  // waits for the oldest to finish
    const int16_t* ready = buf_[(next_ + 1) % 3];    // == next_ - 2
    next_++;
    return ready;
  }

  void end() {
    if (!running_) return;
    M5.Mic.end();
    running_ = false;
  }

  bool running() const { return running_; }

 private:
  int16_t buf_[3][SAMPLES];
  uint32_t rate_ = 16000;
  uint32_t next_ = 0;
  bool running_ = false;
};
