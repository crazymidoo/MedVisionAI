from ultralytics import YOLO

def main():
    model = YOLO("yolov8n.pt")

    config_file_path = "data.yaml"
    project = "runs/fracture_detection"
    experiment = "Fast-Model"

    model.train(
        data=config_file_path,
        epochs=10,
        imgsz=416,
        batch=4,
        patience=3,
        project=project,
        name=experiment,
        verbose=True,
        val=True,
        augment=False,
        mosaic=0.0,
        copy_paste=0.0,
        degrees=0.0,
        scale=0.0,
        shear=0.0
    )

if __name__ == "__main__":
    main()
