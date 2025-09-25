from ultralytics import YOLO

def main():
    model = YOLO("yolov8n.pt")

    config_file_path = "data.yaml"

    project = "runs/fracture_detection"
    experiment = "My-Model"

    batch_size = 4

    result = model.train(
        data=config_file_path,
        epochs=10,  
        project=project,
        name=experiment,
        batch=batch_size,
        patience=5,
        imgsz=256,
        verbose=True,
        val=True
    )

if __name__ == "__main__":
    main()
