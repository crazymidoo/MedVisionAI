from ultralytics import YOLO
import torch

device = "cpu"
print(f"Training su: {device}")

model = YOLO("yolov8n.pt")  # oppure i pesi precedenti per fine-tuning

model.train(
    data="data.yaml",
    epochs=5,
    imgsz=256,
    batch=4,
    device=device,
    workers=2,
    freeze=[0, 1, 2],
    patience=2,
    project="runs/fracture_detection",
    name="Fast-CPU",
    verbose=True,
    val=True,
    augment=False,
    mosaic=0.0,
    copy_paste=0.0
)

print("Training completato! Pesi salvati in:")
print("runs/fracture_detection/Fast-CPU/weights/best.pt")
