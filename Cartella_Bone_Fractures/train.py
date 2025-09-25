from ultralytics import YOLO

def main():
    # Carica il modello (usa yolov8l.pt se vuoi partire da un modello pre-addestrato)
    model = YOLO("yolov8n.pt")

    # Path al file data.yaml del dataset
    config_file_path = "Cartella_Bone_Fractures/data.yaml"

    # Directory dove salvare i risultati
    project = "runs/fracture_detection"
    experiment = "My-Model"

    # Parametri di training
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
