#pragma once

#include <math.h>
#include <stddef.h>
#include <stdint.h>

/**
 * Tells speech from room noise by loudness, against a noise floor it learns
 * from the quiet frames. Deliberately simple: it only has to find where a
 * question starts and stops, not what was said.
 */
class SpeechGate {
 public:
  SpeechGate(float factor, float minRms) : factor_(factor), minRms_(minRms) {}

  /** Classifies one frame and, if it's quiet, folds it into the floor. */
  bool isSpeech(const int16_t* samples, size_t n) {
    // Remove the DC offset first; the PDM mic has a little.
    int64_t sum = 0;
    for (size_t i = 0; i < n; i++) sum += samples[i];
    float mean = (float)sum / n;
    double energy = 0;
    for (size_t i = 0; i < n; i++) {
      float v = samples[i] - mean;
      energy += v * v;
    }
    lastRms_ = sqrtf(energy / n);

    bool speech = lastRms_ > threshold();
    if (!speech) {
      // Slow to rise, quicker to fall: a burst of noise shouldn't deafen it.
      float rate = lastRms_ > floor_ ? 0.02f : 0.1f;
      floor_ += (lastRms_ - floor_) * rate;
      if (floor_ < 1.0f) floor_ = 1.0f;
    }
    return speech;
  }

  float threshold() const {
    float t = floor_ * factor_;
    return t > minRms_ ? t : minRms_;
  }
  float lastRms() const { return lastRms_; }
  float floor() const { return floor_; }

 private:
  float factor_;
  float minRms_;
  float floor_ = 100.0f;
  float lastRms_ = 0;
};
