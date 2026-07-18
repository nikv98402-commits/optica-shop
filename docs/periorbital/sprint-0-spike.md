# Periorbital Sprint 0 spike

## Goal

Decide whether the upstream package is safe and valuable enough for a
non-medical ViLu Eye Map pilot. This spike produces evidence, not production UI.

## Work packages

### 1. Artifact and licence lock

- Resolve the Git commit SHA.
- Enumerate selected Hugging Face files and record SHA-256 hashes.
- Verify model architecture, preprocessing, and output classes against package
  `0.1.3`.
- Obtain legal approval for code, dataset, weights, attribution, and commercial
  use.
- Store approved copies in a controlled private registry, not in this Git repo.

### 2. Reproducible environment

- Create a dedicated Python lockfile.
- Pin Python, PyTorch, torchvision, OpenCV, NumPy, and package/fork versions.
- Add a `health/model` response containing package version, model version,
  weight checksum, device, and output schema.
- Document every local patch in a controlled fork.

### 3. Golden set

- Collect 100-200 explicitly consented photographs.
- Cover iOS/Android/desktop uploads, light levels, skin tones, age bands,
  glasses, makeup, partial occlusion, closed eyes, yaw/pitch/roll, and face size.
- Keep identity and contact data separate from images.
- Record retention, deletion, consent version, and dataset owner.

### 4. Benchmark and failure audit

Measure:

- pipeline success after the existing MediaPipe quality gate;
- p50/p95 end-to-end latency and peak memory on target CPU/GPU;
- no-face, multiple-face, missing-iris, missing-brow, NaN, zero-coordinate,
  impossible-area, and schema failures;
- output reproducibility for the same input and artifact checksums.

### 5. Go/No-go

Go requires:

- at least 90% pipeline success on quality-passed images;
- p95 no more than 30 seconds;
- 100% silent numeric artifacts converted to explicit failures;
- both irises valid for a full result;
- no unapproved licence or privacy blocker.

No-go keeps the current MediaPipe capture, Face-fit score, and try-on. It may
still use the improved capture instructions from the spike.

## Deliverables

- Completed `asset-manifest.json`.
- Reproducible benchmark report and failure distribution.
- Golden-set governance record.
- Go/No-go ADR signed by product, engineering, privacy/legal, and medical copy
  reviewers.
- Recommendation for upstream package, controlled fork, or replacement model.
