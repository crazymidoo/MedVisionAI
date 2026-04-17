# MedVisionAI - Bone Fracture Detection

Web application for fracture detection on X-ray images using YOLOv8 + Flask, with an integrated educational 3D anatomy explorer.

The repository includes:
1. A Flask web app for upload, inference, and visualization.
2. YOLO training and testing scripts.
3. Dataset and model assets used by the UI and training pipeline.

Note: the project is under active development, so some paths/configurations may evolve.

## Main Features

1. X-ray upload and inference from web UI.
2. Fracture bounding-box overlay generation and side-by-side comparison.
3. Confidence score chart for detected boxes.
4. Educational 3D Anatomy Explorer with region-based models and hotspot legend.
5. Region inference from filename tokens (humerus, wrist, hand) with fallback logic.
6. Training and local testing scripts for YOLO-based experiments.

## Tech Stack

1. Python
2. Flask
3. Ultralytics YOLO
4. OpenCV
5. HTML/CSS/JS + Three.js (for 3D viewer)

## Project Structure (Key Paths)

1. [README.md](README.md): project overview.
2. [Cartella_Bone_Fractures/app.py](Cartella_Bone_Fractures/app.py): Flask routes and inference flow.
3. [Cartella_Bone_Fractures/templates/index.html](Cartella_Bone_Fractures/templates/index.html): main dashboard UI.
4. [Cartella_Bone_Fractures/templates/viewer3d.html](Cartella_Bone_Fractures/templates/viewer3d.html): 3D explorer page.
5. [Cartella_Bone_Fractures/static/css/style.css](Cartella_Bone_Fractures/static/css/style.css): dashboard styling.
6. [Cartella_Bone_Fractures/static/models](Cartella_Bone_Fractures/static/models): GLB assets and attribution.
7. [Cartella_Bone_Fractures/train.py](Cartella_Bone_Fractures/train.py): YOLO training script.
8. [Cartella_Bone_Fractures/test_model.py](Cartella_Bone_Fractures/test_model.py): local prediction test script.
9. [Cartella_Bone_Fractures/saved_models](Cartella_Bone_Fractures/saved_models): production model weights used by app.
10. [Cartella_Bone_Fractures/uploads](Cartella_Bone_Fractures/uploads): uploaded images.
11. [Cartella_Bone_Fractures/results](Cartella_Bone_Fractures/results): prediction outputs.

## Setup

### 1) Enter app folder

1. cd Cartella_Bone_Fractures

### 2) (Recommended) Create and activate virtual environment

1. python -m venv .venv
2. source .venv/bin/activate

### 3) Install dependencies

1. pip install --upgrade pip
2. pip install flask ultralytics opencv-python werkzeug torch torchvision

### 4) Linux/Codespaces/WSL OpenCV dependency (if needed)

If you get this error:

ImportError: libGL.so.1: cannot open shared object file

Install system package:

1. sudo apt-get update
2. sudo apt-get install -y libgl1

## Run the Web App

From [Cartella_Bone_Fractures](Cartella_Bone_Fractures):

1. python app.py

Available pages:

1. / : main dashboard
2. /viewer-3d?region=humerus : 3D explorer

Supported upload formats:

1. png
2. jpg
3. jpeg

## Train a Model

From [Cartella_Bone_Fractures](Cartella_Bone_Fractures):

1. python train.py

Default output path from current script:

1. runs/fracture_detection/Fast-CPU/weights/best.pt

Important: verify dataset paths in your YAML before training.

## Test a Trained Model Quickly

From [Cartella_Bone_Fractures](Cartella_Bone_Fractures):

1. Put a test image where expected by [Cartella_Bone_Fractures/test_model.py](Cartella_Bone_Fractures/test_model.py) (currently prova.jpg).
2. python test_model.py

## Configuration Notes

1. App model path is currently set in [Cartella_Bone_Fractures/app.py](Cartella_Bone_Fractures/app.py) to:
	Cartella_Bone_Fractures/saved_models/best.pt
2. [Cartella_Bone_Fractures/data.yaml](Cartella_Bone_Fractures/data.yaml) currently contains Windows-style absolute paths. Update these paths for your environment if you use this file directly.
3. 3D model sources and attribution are listed in:
	[Cartella_Bone_Fractures/static/models/ATTRIBUTION.md](Cartella_Bone_Fractures/static/models/ATTRIBUTION.md)

## Troubleshooting

1. No detections shown:
	Verify that model weights exist at the configured path and confirm image quality/format.
2. App starts but 3D model is missing:
	Check that files exist in [Cartella_Bone_Fractures/static/models](Cartella_Bone_Fractures/static/models).
3. Training cannot find dataset:
	Fix train/val paths in your YAML and rerun training.

## Disclaimer

The 3D explorer is an educational visualization tool and does not represent a patient-specific reconstruction or a medical diagnosis.
