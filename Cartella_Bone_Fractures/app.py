from flask import Flask, render_template, request, send_from_directory
from ultralytics import YOLO
import cv2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

model = YOLO("runs/fracture_detection/Fast-Model/weights/best.pt")
CLASS_NAMES = ["FRACTURE"]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/", methods=["GET", "POST"])
def index():
    result_image = None
    accuracy = None

    if request.method == "POST":
        file = request.files.get("file")
        if not file or file.filename == "" or not allowed_file(file.filename):
            return "File non valido"

        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        img = cv2.imread(filepath)
        if img is None:
            return "Errore nel caricamento dell'immagine"

        results = model(img, verbose=False)[0]
        img_pred = img.copy()
        threshold = 0.2
        max_score = 0.0

        for box in results.boxes.data.tolist():
            x1, y1, x2, y2, score, class_id = box
            if score > threshold:
                max_score = max(max_score, score)
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                class_name = CLASS_NAMES[int(class_id)]
                label = f"{class_name}: {score*100:.1f}%"
                cv2.rectangle(img_pred, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(img_pred, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        accuracy = round(max_score * 100, 2) if max_score > 0 else None
        result_path = os.path.join(RESULT_FOLDER, filename)
        cv2.imwrite(result_path, img_pred)
        result_image = filename

    return render_template("index.html", result_image=result_image, accuracy=accuracy)

@app.route("/results/<filename>")
def send_result(filename):
    return send_from_directory(RESULT_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
