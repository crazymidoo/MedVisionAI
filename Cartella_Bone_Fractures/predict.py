from ultralytics import YOLO
import sys

def main():

    model = YOLO("runs/fracture_detection/My-Model5/weights/best.pt")

    if len(sys.argv) > 1:
        source = sys.argv[1]
    else:
        source = "Cartella_Bone_Fractures/valid/images"

    # Fai la predizione
    results = model.predict(
        source=source, 
        save=True,   
        conf=0.25    
    )

    print(f"Predizioni completate. Risultati salvati in {results[0].save_dir}")

if __name__ == "__main__":
    main()
