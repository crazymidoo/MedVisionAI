from ultralytics import YOLO

device = "cpu"
print(f"Training su: {device}")

model = YOLO("yolov8n.pt")

model.train(
    data="/workspaces/MedVisionAI/dataset_completo/data.yaml",
    epochs=50,
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

print("Training completato! Pesi salvati in:")
print("runs/fracture_detection/Fast-CPU/weights/best.pt")
