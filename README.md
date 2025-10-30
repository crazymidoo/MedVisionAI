# Bone Fracture Detection (Work in Progress)

This project aims to build a **web application** for detecting bone fractures in X-ray images using **YOLOv8** and **Flask**.  
It includes both the **training pipeline** for the model and a **Flask-based interface** for image upload and fracture visualization.

> ⚠️ Note: The project is still under development. Some features, paths, and configurations may change.

---

## Features 

- **YOLOv8-based fracture detection**
- **Upload X-ray images** via a simple Flask web app
- **Bounding box visualization** for detected fractures
- **Custom training support** for your own datasets
- Organized structure for `uploads/`, `results/`, and `saved_models/`

---

## How to Run the Project
* cd Cartella_Bone_Fractures
* pip install flask ultralytics opencv-python werkzeug torch torchvision
> ⚠️ For Codespaces, Docker, or WSL users.
If you encounter an error like "ImportError: libGL.so.1: cannot open shared object file: No such file or directory"
> it means some system libraries required by OpenCV are missing.
Install them with:
* sudo apt-get update
* sudo apt-get install -y libgl1

### Run the Flask app
* python app.py
