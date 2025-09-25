from flask import Flask, render_template, request, send_from_directory
from ultralytics import YOLO
import cv2
import os

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

model_path = "runs/fracture_detection/My-Model2/weights/best.pt"

model = YOLO(model_path)

@app.route("/", methods=["GET", "POST"])
def index():
    result_image = None
    if request.method == "POST":
        if "file" not in request.files:
            return "Nessun file caricato"
        file = request.files["file"]
        if file.filename == "":
            return "Nessun file selezionato"

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        img = cv2.imread(filepath)
        if img is None:
            return "Errore nel caricamento dell'immagine"

        results = model(img)[0]
        img_pred = img.copy()
        threshold = 0.5

        for result in results.boxes.data.tolist():
            x1, y1, x2, y2, score, class_id = result
            if score > threshold:
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                cv2.rectangle(img_pred, (x1, y1), (x2, y2), (0,255,0), 2)
                class_name = results.names[int(class_id)].upper()
                cv2.putText(img_pred, class_name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

        result_path = os.path.join(RESULT_FOLDER, file.filename)
        cv2.imwrite(result_path, img_pred)
        result_image = file.filename

    return render_template("index.html", result_image=result_image)

@app.route("/results/<filename>")
def send_result(filename):
    return send_from_directory(RESULT_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
