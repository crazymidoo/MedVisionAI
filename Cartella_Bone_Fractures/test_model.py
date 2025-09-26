from ultralytics import YOLO
import cv2

# Carica il modello addestrato
model = YOLO("runs/fracture_detection/Fast-CPU/weights/best.pt")

# Percorso immagine da testare
image_path = "prova.jpg"  # metti qui il nome della tua immagine

# Predizione
results = model.predict(image_path, imgsz=256, device="cpu", verbose=True)[0]

# Stampa il numero di box rilevati
boxes = results.boxes.data.tolist()
print(f"Numero di box rilevati: {len(boxes)}")

# Mostra le predizioni
img = cv2.imread(image_path)
img_pred = img.copy()

for box in boxes:
    x1, y1, x2, y2, score, class_id = box
    x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
    label = f"FRACTURE: {score*100:.1f}%"
    cv2.rectangle(img_pred, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.putText(img_pred, label, (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

cv2.imshow("Predizioni", img_pred)
cv2.waitKey(0)
cv2.destroyAllWindows()
