#include "wake_word.h"

#include <Arduino.h>

#include <algorithm>
#include <new>

#include "microfrontend/frontend.h"
#include "microfrontend/frontend_util.h"
#include "tensorflow/lite/micro/micro_allocator.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_resource_variable.h"
#include "tensorflow/lite/schema/schema_generated.h"

// ── Front-end settings. Every microWakeWord model is trained with exactly
//    these (esphome/components/micro_wake_word/preprocessor_settings.h). ──────

static constexpr int SAMPLE_RATE = 16000;
static constexpr int FEATURE_SIZE = 40;
static constexpr int FEATURE_DURATION_MS = 30;
static constexpr int FEATURE_STEP_MS = 10;

/** Inferences to skip after (re)starting, so stale state can't fire. */
static constexpr int16_t MIN_SLICES_BEFORE_DETECTION = 100;
/** Holds the models' streaming state (their resource variables). */
static constexpr size_t VARIABLE_ARENA_SIZE = 1024;

static FrontendState frontend;

using OpResolver = tflite::MicroMutableOpResolver<20>;

static bool registerOps(OpResolver& r) {
  return r.AddCallOnce() == kTfLiteOk && r.AddVarHandle() == kTfLiteOk && r.AddReshape() == kTfLiteOk &&
         r.AddReadVariable() == kTfLiteOk && r.AddStridedSlice() == kTfLiteOk &&
         r.AddConcatenation() == kTfLiteOk && r.AddAssignVariable() == kTfLiteOk && r.AddConv2D() == kTfLiteOk &&
         r.AddMul() == kTfLiteOk && r.AddAdd() == kTfLiteOk && r.AddMean() == kTfLiteOk &&
         r.AddFullyConnected() == kTfLiteOk && r.AddLogistic() == kTfLiteOk && r.AddQuantize() == kTfLiteOk &&
         r.AddDepthwiseConv2D() == kTfLiteOk && r.AddAveragePool2D() == kTfLiteOk &&
         r.AddMaxPool2D() == kTfLiteOk && r.AddPad() == kTfLiteOk && r.AddPack() == kTfLiteOk &&
         r.AddSplitV() == kTfLiteOk;
}

struct WakeWordDetector::Model {
  const WakeWordModel* spec = nullptr;
  OpResolver resolver;
  uint8_t* arena = nullptr;
  uint8_t* varArena = nullptr;
  tflite::MicroInterpreter* interpreter = nullptr;
  uint8_t stride = 1;
  uint8_t strideStep = 0;
  uint8_t probabilities[16] = {0};
  uint8_t lastIndex = 0;
  int16_t ignoreWindows = -MIN_SLICES_BEFORE_DETECTION;

  bool load(const WakeWordModel* m) {
    spec = m;
    if (m->slidingWindowSize == 0 || m->slidingWindowSize > sizeof(probabilities)) return false;
    if (!registerOps(resolver)) return false;

    const tflite::Model* model = tflite::GetModel(m->tflite);
    if (model->version() != TFLITE_SCHEMA_VERSION) {
      Serial.println("Wake word: unsupported model schema.");
      return false;
    }

    // The manifest's arena size depends on the esp-nn build it was measured
    // with; try it, then 1.5x and 2x, as ESPHome does.
    const size_t attempts[] = {m->tensorArenaSize, m->tensorArenaSize * 3 / 2, m->tensorArenaSize * 2};
    for (size_t size : attempts) {
      size = (size + 15) & ~size_t(15);
      varArena = (uint8_t*)heap_caps_malloc(VARIABLE_ARENA_SIZE, MALLOC_CAP_8BIT);
      arena = (uint8_t*)heap_caps_aligned_alloc(16, size, MALLOC_CAP_8BIT);
      if (!varArena || !arena) {
        free(varArena);
        free(arena);
        return false;
      }
      tflite::MicroAllocator* ma = tflite::MicroAllocator::Create(varArena, VARIABLE_ARENA_SIZE);
      tflite::MicroResourceVariables* mrv = tflite::MicroResourceVariables::Create(ma, 20);
      interpreter = new (std::nothrow) tflite::MicroInterpreter(model, resolver, arena, size, mrv);
      if (interpreter && interpreter->AllocateTensors() == kTfLiteOk) {
        Serial.printf("Wake word \"%s\": arena %u bytes\n", m->wakeWord, (unsigned)size);
        break;
      }
      delete interpreter;
      interpreter = nullptr;
      free(arena);
      free(varArena);
      arena = varArena = nullptr;
    }
    if (!interpreter) return false;

    TfLiteTensor* input = interpreter->input(0);
    TfLiteTensor* output = interpreter->output(0);
    if (input->dims->size != 3 || input->dims->data[0] != 1 || input->dims->data[2] != FEATURE_SIZE ||
        input->type != kTfLiteInt8 || output->type != kTfLiteUInt8) {
      Serial.println("Wake word: model has unexpected tensor shapes.");
      return false;
    }
    stride = input->dims->data[1];
    return true;
  }

  /** One 10 ms feature slice. Runs the network once every `stride` slices. */
  bool infer(const int8_t* features) {
    TfLiteTensor* input = interpreter->input(0);
    memcpy(tflite::GetTensorData<int8_t>(input) + FEATURE_SIZE * strideStep, features, FEATURE_SIZE);
    if (++strideStep < stride) return true;
    strideStep = 0;

    if (interpreter->Invoke() != kTfLiteOk) return false;
    lastIndex = (lastIndex + 1) % spec->slidingWindowSize;
    probabilities[lastIndex] = interpreter->output(0)->data.uint8[0];
    // Cool off after a detection: count up only on low-probability windows.
    if (probabilities[lastIndex] < spec->probabilityCutoff) ignoreWindows = std::min<int16_t>(ignoreWindows + 1, 0);
    return true;
  }

  uint8_t average() const {
    uint32_t sum = 0;
    for (uint8_t i = 0; i < spec->slidingWindowSize; i++) sum += probabilities[i];
    return sum / spec->slidingWindowSize;
  }

  bool detected() const {
    if (ignoreWindows < 0) return false;
    uint32_t sum = 0;
    for (uint8_t i = 0; i < spec->slidingWindowSize; i++) sum += probabilities[i];
    return sum > (uint32_t)spec->probabilityCutoff * spec->slidingWindowSize;
  }

  void reset() {
    memset(probabilities, 0, sizeof(probabilities));
    ignoreWindows = -MIN_SLICES_BEFORE_DETECTION;
  }
};

bool WakeWordDetector::begin(const WakeWordModel* const* models, size_t count) {
  FrontendConfig config;
  config.window.size_ms = FEATURE_DURATION_MS;
  config.window.step_size_ms = FEATURE_STEP_MS;
  config.filterbank.num_channels = FEATURE_SIZE;
  config.filterbank.lower_band_limit = 125.0f;
  config.filterbank.upper_band_limit = 7500.0f;
  config.noise_reduction.smoothing_bits = 10;
  config.noise_reduction.even_smoothing = 0.025f;
  config.noise_reduction.odd_smoothing = 0.06f;
  config.noise_reduction.min_signal_remaining = 0.05f;
  config.pcan_gain_control.enable_pcan = 1;
  config.pcan_gain_control.strength = 0.95f;
  config.pcan_gain_control.offset = 80.0f;
  config.pcan_gain_control.gain_bits = 21;
  config.log_scale.enable_log = 1;
  config.log_scale.scale_shift = 6;
  if (!FrontendPopulateState(&config, &frontend, SAMPLE_RATE)) {
    Serial.println("Wake word: could not allocate the audio front-end.");
    return false;
  }
  frontendReady_ = true;

  count_ = std::min(count, MAX_MODELS);
  for (size_t i = 0; i < count_; i++) {
    models_[i] = new (std::nothrow) Model();
    if (!models_[i] || !models_[i]->load(models[i])) {
      Serial.printf("Wake word: could not load \"%s\".\n", models[i]->wakeWord);
      return false;
    }
  }
  return true;
}

const WakeWordModel* WakeWordDetector::feed(const int16_t* samples, size_t count) {
  const WakeWordModel* detected = nullptr;
  while (count > 0) {
    size_t used = 0;
    FrontendOutput out = FrontendProcessSamples(&frontend, samples, count, &used);
    samples += used;
    count -= used;
    if (out.size == 0) continue;

    // Scale the front-end's 0..~670 output to the int8 range the models were
    // quantized for: (value / 25.6 / 26.0) * 256 - 128, in integer math.
    int8_t features[FEATURE_SIZE];
    for (size_t i = 0; i < out.size && i < FEATURE_SIZE; i++) {
      int32_t v = ((int32_t)out.values[i] * 256 + 333) / 666 - 128;
      features[i] = (int8_t)std::max<int32_t>(-128, std::min<int32_t>(127, v));
    }
    processFeatures(features, &detected);
  }
  return detected;
}

bool WakeWordDetector::processFeatures(const int8_t* features, const WakeWordModel** detected) {
  for (size_t i = 0; i < count_; i++) {
    Model* m = models_[i];
    if (!m->infer(features)) return false;
    peak_ = std::max(peak_, m->average());
    if (!*detected && m->detected()) {
      *detected = m->spec;
      // Reset every model, so one utterance fires once.
      for (size_t j = 0; j < count_; j++) models_[j]->reset();
      return true;
    }
  }
  return true;
}

void WakeWordDetector::reset() {
  if (frontendReady_) FrontendReset(&frontend);
  for (size_t i = 0; i < count_; i++) models_[i]->reset();
}

uint8_t WakeWordDetector::takePeakProbability() {
  uint8_t p = peak_;
  peak_ = 0;
  return p;
}
