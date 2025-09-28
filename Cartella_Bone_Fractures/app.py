from flask import Flask, render_template, request, send_from_directory
from ultralytics import YOLO
import cv2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RESULT_FOLDER = os.path.join(BASE_DIR, "results")
MODEL_PATH = os.path.join(BASE_DIR, "saved_models", "best.pt")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

model = YOLO(MODEL_PATH)
CLASS_NAMES = ["FRACTURE"]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/", methods=["GET", "POST"])
def index():
    original_image = None
    result_image = None
    accuracy = None

    if request.method == "POST":
        file = request.files.get("file")
        if not file or file.filename == "" or not allowed_file(file.filename):
            return "File non valido"

        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        original_image = filename

        results = model.predict(filepath, imgsz=256, device="cpu", verbose=False)[0]

        img = cv2.imread(filepath)
        img_pred = img.copy()
        max_score = 0.0
        threshold = 0.05

        for box in results.boxes.data.tolist():
            x1, y1, x2, y2, score, class_id = box
            if score > threshold:
                max_score = max(max_score, score)
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                class_name = CLASS_NAMES[int(class_id)]
                cv2.rectangle(img_pred, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(img_pred, class_name, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        accuracy = round(max_score * 100, 2) if max_score > 0 else None

        result_path = os.path.join(RESULT_FOLDER, filename)
        cv2.imwrite(result_path, img_pred)
        result_image = filename

    return render_template("index.html",
                           original_image=original_image,
                           result_image=result_image,
                           accuracy=accuracy)

@app.route("/uploads/<filename>")
def send_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/results/<filename>")
def send_result(filename):
    return send_from_directory(RESULT_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
