from ultralytics import YOLO
import cv2
import glob
import os
import matplotlib.pyplot as plt

images = glob.glob("Cartella_Bone_Fractures/valid/images/*.jpg")
if not images:
    raise FileNotFoundError("Nessuna immagine trovata nella cartella.")

imgTest = images[0]
imgAnot = os.path.join("Cartella_Bone_Fractures/valid/labels", os.path.basename(imgTest).replace(".jpg", ".txt"))

if not os.path.exists(imgAnot):
    raise FileNotFoundError(f"File di annotazioni non trovato: {imgAnot}")

print(f"Immagine caricata: {imgTest}")
print(f"Annotazioni caricate: {imgAnot}")

img = cv2.imread(imgTest)
if img is None:
    raise ValueError(f"Errore nel caricamento dell'immagine: {imgTest}")

H, W, _ = img.shape

imgPredict = img.copy()
model_path = "runs/fracture_detection/My-Model5/weights/best.pt"
model = YOLO(model_path)

threshold = 0.5
results = model(imgPredict)[0]

for result in results.boxes.data.tolist():
    x1, y1, x2, y2, score, class_id = result
    if score > threshold:
        x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
        cv2.rectangle(imgPredict, (x1, y1), (x2, y2), (0,255,0), 1)
        class_name = results.names[int(class_id)].upper()
        cv2.putText(imgPredict, class_name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1, cv2.LINE_AA)

imgTruth = img.copy()
with open(imgAnot, 'r') as file:
    lines = file.readlines()

annotations = []
for line in lines:
    values = line.split()
    label = values[0]
    x, y, w, h = map(float, values[1:])
    annotations.append((label, x, y, w, h))

for annotation in annotations:
    label, x, y, w, h = annotation
    label = results.names[int(label)].upper()
    x1 = int((x - w / 2) * W)
    y1 = int((y - h / 2) * H)
    x2 = int((x + w / 2) * W)
    y2 = int((y + h / 2) * H)
    cv2.rectangle(imgTruth, (x1, y1), (x2, y2), (0,0,255), 1)
    cv2.putText(imgTruth, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 1)

def bgr2rgb(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

plt.figure(figsize=(15,5))
plt.subplot(1,3,1)
plt.title("Prediction")
plt.imshow(bgr2rgb(imgPredict))
plt.axis('off')

plt.subplot(1,3,2)
plt.title("Ground Truth")
plt.imshow(bgr2rgb(imgTruth))
plt.axis('off')

plt.subplot(1,3,3)
plt.title("Original")
plt.imshow(bgr2rgb(img))
plt.axis('off')

plt.show()
