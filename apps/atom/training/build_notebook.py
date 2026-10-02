#!/usr/bin/env python3
"""Builds train_hola_olivia.ipynb. Edit the cells here, not the .ipynb."""
import json
import pathlib

cells = []


def md(text):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": text.strip("\n")})


def code(text):
    cells.append(
        {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": text.strip("\n")}
    )


md(r"""
# Train the "Hola Olivia" / "Hi Olivia" wake word

Trains one [microWakeWord](https://github.com/OHF-Voice/micro-wake-word) model that fires on **"Hola Olivia"**
and **"Hi Olivia"** — but not on "Olivia" alone, so saying a client's name doesn't wake the device.

**Run it on Google Colab with a GPU:** *Runtime → Change runtime type → T4 GPU*, then *Runtime → Run all*.
It takes a few hours. Keep this tab open, in only one tab, and the computer awake.

**It survives disconnects.** Step 2 asks to connect Google Drive (approve the popup). Everything slow to make —
samples, features, training checkpoints — is saved in `My Drive/hola_olivia/`, so if Colab disconnects,
reconnect and *Run all* again: finished work is skipped and training resumes from its last checkpoint. The
big downloads (~6 GB) stay on the Colab machine and are simply fetched again.

**Optional, strongly recommended:** real recordings. Synthetic Spanish voices are few (nine speakers), and the
model will be best at the voices it has heard. Record each person in the studio saying *"Hola Olivia"* and
*"Hi Olivia"* 20–30 times each (phone voice memos are fine — vary distance, speed and tone), and upload them into
`My Drive/hola_olivia/real_samples/` (from Google Drive on your phone or computer) before running the notebook.

When it finishes, it downloads `hola_olivia.zip` with `hola_olivia.tflite` and `hola_olivia.json`. Then, in the repo:

```sh
unzip hola_olivia.zip -d apps/atom/models/
cd apps/atom && python3 scripts/embed-model.py models/hola_olivia.json
# switch firmware/wake_words.h to the new model, then:
pnpm flash:atom
```

> **Licensing:** the background-noise and negative datasets downloaded below come from mixed sources. The
> microWakeWord author notes that models trained with them should be treated as **non-commercial** use.
> Check this is acceptable for the studio before relying on the model.
""")

code(r"""
# 1. Install microWakeWord and the sample generator. Restart the session afterwards
#    if Colab asks you to (Runtime → Restart session), then continue from step 2.
%cd /content
!pip install -q 'git+https://github.com/whatsnowplaying/audio-metadata@d4ebb238e6a401bb1a5aaaac60c9e2b3cb30929f'
!git clone -q https://github.com/OHF-Voice/micro-wake-word microWakeWord
!pip install -q -e ./microWakeWord
# From the repo, not PyPI: the 3.2.0 wheel leaves out its own `piper_train`
# package and fails with "No module named 'piper_train'" (see step 3).
![ -d piper-sample-generator ] || git clone -q --branch v3.2.0 https://github.com/rhasspy/piper-sample-generator
!pip install -q ./piper-sample-generator
# datasets 4 decodes audio into objects microWakeWord can't read ("AudioDecoder
# object is not subscriptable" in steps 6-7); it's written for datasets 3.
!pip install -q "datasets<4"
# piper-sample-generator pins audiomentations 0.33, which lacks AddColorNoise
# (step 7). Sample generation doesn't use it, so take the current one back.
!pip install -q -U "audiomentations>=0.42"
""")

code(r"""
# 2. Save progress to Google Drive (approve the popup), then: what to train.
import os
from google.colab import drive
drive.mount("/content/drive")
WORK = "/content/drive/MyDrive/hola_olivia"   # samples, features, checkpoints: survive disconnects
CACHE = "/content"                            # big re-downloadable data: lost on disconnect, that's fine
os.makedirs(WORK, exist_ok=True)
os.chdir(WORK)

# Phonetic spellings help the English voices say the Spanish phrase.
MODEL_ID = "hola_olivia"
WAKE_WORD = "Hola Olivia / Hi Olivia"

SPANISH_POSITIVES = ["Hola Olivia", "Hola, Olivia", "¡Hola Olivia!"]
ENGLISH_POSITIVES = ["Hi Olivia", "Hi, Olivia", "Hola Olivia", "oh la oh liv ee ah"]

# Said near the device all the time, and must NOT wake it. "Olivia" alone is here
# on purpose: a client may be called Olivia.
SPANISH_NEGATIVES = ["Olivia", "Hola", "Hola Silvia", "Hola Lidia", "Hola Olga", "Bolivia", "aceite de oliva",
                     "hola vida", "Hola, ¿qué tal?", "Hola Sofía", "Olivia, túmbate aquí", "hola a todas"]
ENGLISH_NEGATIVES = ["Olivia", "Hi", "Hi Olive", "Hey Sylvia", "Hi Lydia", "Bolivia", "Hi there", "Hi Liv",
                     "all of you", "Oh, lovely"]

POSITIVES_PER_SPANISH_VOICE = 250
ENGLISH_POSITIVES_TOTAL = 3000
NEGATIVES_PER_SPANISH_VOICE = 150
ENGLISH_NEGATIVES_TOTAL = 2000
""")

code(r"""
# 3. Voices: every Spanish Piper voice, plus the English multi-speaker generator.
import os, urllib.request

# Make the sample generator's `piper_train` importable in the `!python3 -m ...`
# commands below (the pip package doesn't ship it).
os.environ["PYTHONPATH"] = f"{CACHE}/piper-sample-generator" + os.pathsep + os.environ.get("PYTHONPATH", "")

SPANISH_VOICES = [
    "es/es_ES/davefx/medium/es_ES-davefx-medium",
    "es/es_ES/sharvard/medium/es_ES-sharvard-medium",
    "es/es_ES/carlfm/x_low/es_ES-carlfm-x_low",
    "es/es_ES/mls_10246/low/es_ES-mls_10246-low",
    "es/es_ES/mls_9972/low/es_ES-mls_9972-low",
    "es/es_MX/ald/medium/es_MX-ald-medium",
    "es/es_MX/claude/high/es_MX-claude-high",
    "es/es_AR/daniela/high/es_AR-daniela-high",
]
VOICES = f"{CACHE}/voices"
os.makedirs(VOICES, exist_ok=True)
base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/"
for v in SPANISH_VOICES:
    name = v.split("/")[-1]
    for ext in (".onnx", ".onnx.json"):
        path = f"{VOICES}/{name}{ext}"
        if not os.path.exists(path):
            urllib.request.urlretrieve(base + v + ext, path)

# Must sit next to its settings file, which ships in the repo's models/ folder.
EN_GENERATOR = f"{CACHE}/piper-sample-generator/models/en_US-libritts_r-medium.pt"
if not os.path.exists(EN_GENERATOR):
    urllib.request.urlretrieve(
        "https://github.com/rhasspy/piper-sample-generator/releases/download/v2.0.0/en_US-libritts_r-medium.pt",
        EN_GENERATOR)
print("voices ready")
""")

code(r"""
# 4. Generate positive and negative samples. Each (voice, phrase) batch that's
#    already in Drive is skipped, so re-running after a disconnect carries on.
import glob, shutil

for d in ("positives", "negatives"):
    os.makedirs(d, exist_ok=True)

def generate(text, model, tag, kind, count, batch=1):
    if glob.glob(f"{kind}/{tag}_*.wav"):
        return  # done in an earlier run
    tmp = f"{CACHE}/tmp_{kind}_{tag}"
    shutil.rmtree(tmp, ignore_errors=True)
    !python3 -m piper_sample_generator "{text}" --model {model} --max-samples {count} --batch-size {batch} --output-dir {tmp}
    for f in glob.glob(f"{tmp}/*.wav"):
        shutil.copy(f, f"{kind}/{tag}_{os.path.basename(f)}")
    shutil.rmtree(tmp, ignore_errors=True)

for v in SPANISH_VOICES:
    name = v.split("/")[-1]
    model = f"{VOICES}/{name}.onnx"
    for i, text in enumerate(SPANISH_POSITIVES):
        generate(text, model, f"{name}_{i}", "positives", POSITIVES_PER_SPANISH_VOICE // len(SPANISH_POSITIVES) + 1)
    for i, text in enumerate(SPANISH_NEGATIVES):
        generate(text, model, f"{name}_{i}", "negatives", NEGATIVES_PER_SPANISH_VOICE // len(SPANISH_NEGATIVES) + 1)

for i, text in enumerate(ENGLISH_POSITIVES):
    generate(text, EN_GENERATOR, f"en_{i}", "positives", ENGLISH_POSITIVES_TOTAL // len(ENGLISH_POSITIVES), batch=100)
for i, text in enumerate(ENGLISH_NEGATIVES):
    generate(text, EN_GENERATOR, f"en_{i}", "negatives", ENGLISH_NEGATIVES_TOTAL // len(ENGLISH_NEGATIVES), batch=100)

print(len(glob.glob("positives/*.wav")), "positives,", len(glob.glob("negatives/*.wav")), "negatives")
""")

code(r"""
# Listen to a few before spending hours on training.
from IPython.display import Audio, display
import random
for f in random.sample(glob.glob("positives/*.wav"), 3) + random.sample(glob.glob("negatives/*.wav"), 2):
    print(f); display(Audio(f))
""")

code(r"""
# 5. Real recordings (optional). Upload them into real_samples/ first (any format).
#    Each is used several times, because real voices are worth more than synthetic ones.
import subprocess
REAL_REPEATS = 8
real = [f for f in glob.glob("real_samples/**/*", recursive=True) if os.path.isfile(f)]
for n, f in enumerate(real):
    for r in range(REAL_REPEATS):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f, "-ac", "1", "-ar", "16000",
                        f"positives/real_{n}_{r}.wav"], check=True)
print(f"{len(real)} real recordings added x{REAL_REPEATS}")
""")

code(r"""
# 6. Background noise and room acoustics for augmentation (from microWakeWord's notebook).
import datasets, scipy, numpy as np
from pathlib import Path
from tqdm import tqdm

if not os.path.exists(f"{CACHE}/mit_rirs"):
    os.mkdir(f"{CACHE}/mit_rirs")
    for row in tqdm(datasets.load_dataset("davidscripka/MIT_environmental_impulse_responses", split="train", streaming=True)):
        name = row['audio']['path'].split('/')[-1]
        scipy.io.wavfile.write(os.path.join(f"{CACHE}/mit_rirs", name), 16000, (row['audio']['array'] * 32767).astype(np.int16))

if not os.path.exists(f"{CACHE}/audioset_16k"):
    os.makedirs(f"{CACHE}/audioset", exist_ok=True)
    !wget -q -O {CACHE}/audioset/bal_train09.tar https://huggingface.co/datasets/agkphysics/AudioSet/resolve/main/data/bal_train09.tar
    !cd {CACHE}/audioset && tar -xf bal_train09.tar
    os.mkdir(f"{CACHE}/audioset_16k")
    ds = datasets.Dataset.from_dict({"audio": [str(i) for i in Path(f"{CACHE}/audioset/audio").glob("**/*.flac")]})
    ds = ds.cast_column("audio", datasets.Audio(sampling_rate=16000))
    for row in tqdm(ds):
        name = row['audio']['path'].split('/')[-1].replace(".flac", ".wav")
        scipy.io.wavfile.write(os.path.join(f"{CACHE}/audioset_16k", name), 16000, (row['audio']['array'] * 32767).astype(np.int16))

if not os.path.exists(f"{CACHE}/fma_16k"):
    os.makedirs(f"{CACHE}/fma", exist_ok=True)
    !wget -q -O {CACHE}/fma/fma_xs.zip https://huggingface.co/datasets/mchl914/fma_xsmall/resolve/main/fma_xs.zip
    !cd {CACHE}/fma && unzip -q fma_xs.zip
    os.mkdir(f"{CACHE}/fma_16k")
    ds = datasets.Dataset.from_dict({"audio": [str(i) for i in Path(f"{CACHE}/fma/fma_small").glob("**/*.mp3")]})
    ds = ds.cast_column("audio", datasets.Audio(sampling_rate=16000))
    for row in tqdm(ds):
        name = row['audio']['path'].split('/')[-1].replace(".mp3", ".wav")
        scipy.io.wavfile.write(os.path.join(f"{CACHE}/fma_16k", name), 16000, (row['audio']['array'] * 32767).astype(np.int16))
""")

code(r"""
# 7. Augment the samples and turn them into spectrogram features.
from microwakeword.audio.augmentation import Augmentation
from microwakeword.audio.clips import Clips
from microwakeword.audio.spectrograms import SpectrogramGeneration
from mmap_ninja.ragged import RaggedMmap

augmenter = Augmentation(
    augmentation_duration_s=3.2,
    augmentation_probabilities={
        "SevenBandParametricEQ": 0.1, "TanhDistortion": 0.1, "PitchShift": 0.1, "BandStopFilter": 0.1,
        "AddColorNoise": 0.1, "AddBackgroundNoise": 0.75, "Gain": 1.0, "RIR": 0.5,
    },
    impulse_paths=[f"{CACHE}/mit_rirs"],
    background_paths=[f"{CACHE}/fma_16k", f"{CACHE}/audioset_16k"],
    background_min_snr_db=-5,
    background_max_snr_db=10,
    min_jitter_s=0.195,
    max_jitter_s=0.205,
)

def features(input_dir, output_dir):
    clips = Clips(input_directory=input_dir, file_pattern="*.wav", max_clip_duration_s=None,
                  remove_silence=False, random_split_seed=10, split_count=0.1)
    for split, name, repeat, slide in (("training", "train", 2, 10), ("validation", "validation", 1, 10),
                                       ("testing", "test", 1, 1)):
        out = os.path.join(output_dir, split)
        if os.path.exists(os.path.join(out, "wakeword_mmap")):
            continue
        os.makedirs(out, exist_ok=True)
        spectrograms = SpectrogramGeneration(clips=clips, augmenter=augmenter, slide_frames=slide, step_ms=10)
        RaggedMmap.from_generator(out_dir=os.path.join(out, "wakeword_mmap"),
                                  sample_generator=spectrograms.spectrogram_generator(split=name, repeat=repeat),
                                  batch_size=100, verbose=True)

features("positives", "positive_features")
features("negatives", "adversarial_features")
""")

code(r"""
# 8. Negative datasets: general speech, dinner-party chatter, and non-speech noise.
NEG = f"{CACHE}/negative_datasets"
os.makedirs(NEG, exist_ok=True)
for fname in ["dinner_party.zip", "dinner_party_eval.zip", "no_speech.zip", "speech.zip"]:
    if not os.path.exists(f"{NEG}/{fname[:-4]}"):
        !wget -q -O {NEG}/{fname} https://huggingface.co/datasets/kahrendt/microwakeword/resolve/main/{fname}
        !unzip -q {NEG}/{fname} -d {NEG}
        os.remove(f"{NEG}/{fname}")
""")

code(r"""
# 9. Training settings (microWakeWord's defaults, plus our look-alike negatives weighted up).
import yaml

config = {
    "window_step_ms": 10,
    "train_dir": f"trained_models/{MODEL_ID}",
    "features": [
        {"features_dir": "positive_features", "sampling_weight": 2.0, "penalty_weight": 1.0, "truth": True,
         "truncation_strategy": "truncate_start", "type": "mmap"},
        {"features_dir": "adversarial_features", "sampling_weight": 4.0, "penalty_weight": 2.0, "truth": False,
         "truncation_strategy": "truncate_start", "type": "mmap"},
        {"features_dir": f"{NEG}/speech", "sampling_weight": 10.0, "penalty_weight": 1.0, "truth": False,
         "truncation_strategy": "random", "type": "mmap"},
        {"features_dir": f"{NEG}/dinner_party", "sampling_weight": 10.0, "penalty_weight": 1.0,
         "truth": False, "truncation_strategy": "random", "type": "mmap"},
        {"features_dir": f"{NEG}/no_speech", "sampling_weight": 5.0, "penalty_weight": 1.0,
         "truth": False, "truncation_strategy": "random", "type": "mmap"},
        {"features_dir": f"{NEG}/dinner_party_eval", "sampling_weight": 0.0, "penalty_weight": 1.0,
         "truth": False, "truncation_strategy": "split", "type": "mmap"},
    ],
    "training_steps": [20000],
    "positive_class_weight": [1],
    "negative_class_weight": [20],
    "learning_rates": [0.001],
    "batch_size": 128,
    "time_mask_max_size": [0], "time_mask_count": [0], "freq_mask_max_size": [0], "freq_mask_count": [0],
    "eval_step_interval": 500,
    "clip_duration_ms": 1500,
    "target_minimization": 0.9,
    "minimization_metric": None,
    "maximization_metric": "average_viable_recall",
}
with open("training_parameters.yaml", "w") as f:
    yaml.dump(config, f)
""")

code(r"""
# 10. Train. Slow on Colab, and quiet for minutes at a time — that's normal.
#     Re-running resumes from the last checkpoint.
!python -m microwakeword.model_train_eval \
--training_config='training_parameters.yaml' \
--train 1 \
--restore_checkpoint 1 \
--test_tf_nonstreaming 0 \
--test_tflite_nonstreaming 0 \
--test_tflite_nonstreaming_quantized 0 \
--test_tflite_streaming 0 \
--test_tflite_streaming_quantized 1 \
--use_weights "best_weights" \
mixednet \
--pointwise_filters "64,64,64,64" \
--repeat_in_block  "1, 1, 1, 1" \
--mixconv_kernel_sizes '[5], [7,11], [9,15], [23]' \
--residual_connection "0,0,0,0" \
--first_conv_filters 32 \
--first_conv_kernel_size 5 \
--stride 3
""")

code(r"""
# 11. Package the model with its manifest and download it.
#     Read the test results printed above: if it misses too often, lower
#     probability_cutoff; if it fires on its own, raise it (it can also be tuned
#     later in the .json without retraining).
import json, zipfile
tflite = f"trained_models/{MODEL_ID}/tflite_stream_state_internal_quant/stream_state_internal_quant.tflite"
manifest = {
    "type": "micro",
    "wake_word": WAKE_WORD,
    "author": "Mediterránea Face Studio",
    "model": f"{MODEL_ID}.tflite",
    "trained_languages": ["es", "en"],
    "version": 2,
    "micro": {
        "probability_cutoff": 0.97,
        "feature_step_size": 10,
        "sliding_window_size": 5,
        "tensor_arena_size": 30000,
        "minimum_esphome_version": "2024.7.0",
    },
}
with zipfile.ZipFile(f"{MODEL_ID}.zip", "w") as z:
    z.write(tflite, f"{MODEL_ID}.tflite")
    z.writestr(f"{MODEL_ID}.json", json.dumps(manifest, indent=2))

from google.colab import files
files.download(f"{MODEL_ID}.zip")
""")

nb = {
    "cells": cells,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}
out = pathlib.Path(__file__).with_name("train_hola_olivia.ipynb")
out.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n")
print(f"wrote {out.name}: {len(cells)} cells")
