from ultralytics import YOLO
import cv2
import os

imgTest ="C:/Users/abc94/Downloads/Bone-Fracture-Detection/test/images/z_0_715_png.rf.874e9141963fc49296b1c02520c3edf5.jpg"
imgAnot = "C:/Users/abc94/Downloads/Bone-Fracture-Detection/test/labels/z_0_715_png.rf.874e9141963fc49296b1c02520c3edf5.txt"

img = cv2.imread(imgTest)
H, W, _ = img.shape

#Predict:
imgPredict = img.copy()

model_path= os.path.join("C:/Users/abc94/Downloads/Bone-Fracture-Detection", "My-model", "weights", "best.pt")

model = YOLO(model_path)

threshold = 0.5

results = model(imgPredict)[0]

for result in results.boxes.data.tolist():
    x1, y1, x2, y2, score, class_id = result

    x1 = int(x1)
    y1 = int(y1)
    x2 = int(x2)
    y2 = int(y2)

    if score > threshold:
        cv2.rectangle(imgPredict, (x1, y1), (x2, y2), (0,255,0), 1)

        class_name = result.names[int(class_id)].upper()
        cv2.putText(imgPredict, class_name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1, cv2.LINE_AA)


imgTruth = img.copy()

with open(imgAnot, 'r') as file:
    lines = file.readlines()

annotations = []

for line in lines:
    values = line.split()
    label = values[0]
    x, y, w, h = map(float, values[1:])
    annotations.append((label, x,y,w,h))
for annotation in annotations:
    label, x,y,w,h, = annotation
    label= result.names[int(label)].upper()

    x1 = int((x - w / 2) * W)
    y1 = int((y - h / 2) * H)
    x2 = int((x + w / 2) * W)
    y2 = int((y + h / 2) * H)