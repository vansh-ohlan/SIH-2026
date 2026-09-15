# Reproducible WSL / Linux Setup for Real AI OCR Testing

This developer guide provides step-by-step instructions for running real PaddleOCR inference on scanned land records (RoR / Jamabandi) inside a Linux or Windows Subsystem for Linux (WSL) environment.

---

## Background & Environment Context

On Windows CPU environments, PaddleOCR inference can encounter runtime limitations (such as upstream oneDNN / OpenMP thread initialization conflicts). Linux / WSL 2 provides a stable runtime for CPU-based PaddlePaddle and PaddleOCR inference.

---

## 1. System Requirements & Environment Setup

### Required Prerequisites
- **OS**: WSL 2 (Ubuntu 20.04 LTS / 22.04 LTS) or Native Linux (Ubuntu / Debian / RHEL)
- **Python**: Python 3.10 or 3.11 (Recommended)

### Step 1: Initialize Virtual Environment inside WSL

Open your WSL terminal and navigate to the project directory:

```bash
# Navigate to project directory via WSL mount
cd /mnt/c/Users/<YourUsername>/OneDrive/Desktop/SIH2026/SIH-2026

# Create a clean virtual environment inside Linux
python3 -m venv .venv-wsl

# Activate virtual environment
source .venv-wsl/bin/activate

# Upgrade pip and setuptools
pip install --upgrade pip setuptools wheel
```

### Step 2: Install Project Dependencies

Install project dependencies and the CPU PaddlePaddle engine:

```bash
# Install core AI/ML requirements
pip install -r ai_ml/requirements.txt

# Install PaddlePaddle CPU build
pip install paddlepaddle
```

### Step 3: Verify PaddleOCR Initialization

Run the following python verification command inside WSL:

```bash
python -c "import paddle; import paddleocr; print('Paddle version:', paddle.__version__)"
```

Expected output:
```
Paddle version: 3.x.x
```

---

## 2. Real Sample Document Handling (Privacy & Safety)

If you have a legitimately obtained local sample document image on Windows at `C:\tmp\ror_sample.png`:

### Copy Sample into WSL Temporary Directory

Do **NOT** copy sample documents into the Git repository workspace. Copy them directly into the Linux `/tmp` directory:

```bash
# Create local tmp directory in WSL if needed
mkdir -p /tmp

# Copy sample image from Windows filesystem mount
cp /mnt/c/tmp/ror_sample.png /tmp/ror_sample.png

# Set permissions
chmod 600 /tmp/ror_sample.png
```

> **CRITICAL PRIVACY RULE**:
> - Never add `/tmp/ror_sample.png` or real land records to Git.
> - Never commit PII or document images.
> - Do not scrape government portals or download unauthorized records.

---

## 3. Test Execution Flow & Category Distinctions

The project provides four distinct test mechanisms depending on the scope of testing:

```
+-----------------------------------------------------------------------------------+
| TEST CATEGORIES & SCOPES                                                          |
+------------------------------------+----------------------------------------------+
| Test Name                          | Command / Description                        |
+------------------------------------+----------------------------------------------+
| A. Low-Level OCR Smoke Test        | python scripts/ocr_smoke_test.py --image ... |
|    (Engine Isolation)              | Tests raw PaddleOCR initialization & bounds |
+------------------------------------+----------------------------------------------+
| B. AI Full Pipeline Demo           | python -m ai_ml.demo <image_path>            |
|    (Preprocessing -> Anomaly)      | Tests full internal ML extraction pipeline   |
+------------------------------------+----------------------------------------------+
| C. FastAPI Contract Test           | python -m pytest tests/e2e/ -v               |
|    (In-Memory Service Contract)    | Tests route handlers & JSON contract schemas |
+------------------------------------+----------------------------------------------+
| D. Backend -> AI E2E Test          | python -m tests.e2e.harness --file ...       |
|    (Full Network Boundary)         | Tests real HTTP multipart communication flow |
+-----------------------------------------------------------------------------------+
```

---

## 4. Sequence for Running Real E2E Test

To perform a complete end-to-end integration test with a real scanned image:

### Terminal 1: Start AI FastAPI Service (Inside WSL)

```bash
source .venv-wsl/bin/activate
export AI_SERVICE_URL="http://localhost:8000"

python -m uvicorn ai_ml.api.server:create_app --factory --host 0.0.0.0 --port 8000
```

### Terminal 2: Run Low-Level OCR Smoke Test (Optional Verification)

```bash
source .venv-wsl/bin/activate

python scripts/ocr_smoke_test.py --image /tmp/ror_sample.png
```

### Terminal 3: Run Backend E2E Harness against AI Service

```bash
source .venv-wsl/bin/activate
export AI_SERVICE_URL="http://localhost:8000"

python -m tests.e2e.harness --file /tmp/ror_sample.png
```

---

## 5. Troubleshooting & Common Questions

1. **`ImportError: libGL.so.1: cannot open shared object file`**:
   Install OpenCV headless dependencies inside Linux:
   ```bash
   sudo apt-get update && sudo apt-get install -y libgl1-mesa-glx libglib2.0-0
   ```
2. **`OCREngineUnavailableError`**:
   Verify that `paddleocr` and `paddlepaddle` are installed inside `.venv-wsl`.
3. **Accuracy vs Integration**:
   API integration success indicates that HTTP multipart request/response structures and contract JSON schemas match expected types. Accuracy of Hindi/English text extractions is measured separately against ground truth benchmarks in `ai_ml/tests/test_benchmark.py`.
