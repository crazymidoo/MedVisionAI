from ultralytics import YOLO

device = "cpu"
print(f"Training su: {device}")

model = YOLO("yolov8n.pt")

model.train(
<<<<<<< HEAD
    data="/workspaces/MedVisionAI/Cartella_Bone_Fractures/datasets/dataset_completo2/data.yaml",
=======
    data="Cartella_Bone_Fractures/data.yaml",
>>>>>>> 99229b53 (Modifiche app.py)
    epochs=25,
    imgsz=256,
    batch=4,
    device=device,
    workers=2,
    freeze=[0],
    patience=2,
    project="runs/fracture_detection",
    name="Fast-CPU",
    verbose=True,
    val=True,
    augment=True,
    mosaic=0.1,
    copy_paste=0.1
)

<<<<<<< HEAD
print("Training completato! Pesi salvati in:")
=======
print("Training completato. Pesi salvati in:")
>>>>>>> 99229b53 (Modifiche app.py)
print("runs/fracture_detection/Fast-CPU/weights/best.pt")
