#pragma once

#include <stddef.h>
#include <stdint.h>

#include "wake_word_model.h"

/**
 * On-device wake word detection with microWakeWord models.
 *
 * A port of ESPHome's micro_wake_word component (which runs these same models
 * on this same device) to plain Arduino: the audio front-end turns 16 kHz PCM
 * into 40 spectrogram features every 10 ms, and each model is a streaming
 * TFLite Micro network that keeps its own state between calls.
 *
 * Nothing leaves the device while listening: audio is only sent to the server
 * after a model fires.
 *
 * Settings below match those every microWakeWord model is trained with; they
 * are not tunable per model.
 */
class WakeWordDetector {
 public:
  static constexpr size_t MAX_MODELS = 2;

  /** Allocates the front-end and every model. False if anything won't fit. */
  bool begin(const WakeWordModel* const* models, size_t count);

  /**
   * Feeds 16 kHz mono PCM16. Returns the model that detected its wake word in
   * this audio, or nullptr.
   */
  const WakeWordModel* feed(const int16_t* samples, size_t count);

  /**
   * Forgets recent audio. Call after the speaker has been in use, so the tail
   * of an answer can't combine with new audio into a false trigger.
   */
  void reset();

  /** Highest averaged probability seen since the last call, 0-255. For tuning. */
  uint8_t takePeakProbability();

 private:
  struct Model;
  bool processFeatures(const int8_t* features, const WakeWordModel** detected);

  Model* models_[MAX_MODELS] = {nullptr};
  size_t count_ = 0;
  bool frontendReady_ = false;
  uint8_t peak_ = 0;
};
