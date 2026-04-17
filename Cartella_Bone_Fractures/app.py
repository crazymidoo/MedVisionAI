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
REGION_LABELS = {
    "humerus": "Humerus",
    "wrist": "Wrist",
    "hand": "Hand",
}

MODEL_LIBRARY = {
    "humerus": {
        "url": "/static/models/bodyparts3d_right_humerus.glb",
        "source": "BodyParts3D (DBCLS), Right Humerus FMA23130, CC BY-SA 2.1 JP",
    },
    "wrist": {
        "url": "/static/models/bone.glb",
        "source": "Local anatomical GLB (educational use)",
    },
    "hand": {
        "url": "/static/models/test.glb",
        "source": "Local anatomical GLB (educational use)",
    },
}

FREQUENT_SITES = {
    "humerus": [
        {
            "id": "surgical-neck",
            "label": "Surgical neck",
            "description": "Common fracture site after falls in adults.",
            "position": {"x": 0.20, "y": 1.65, "z": 0.12},
        },
        {
            "id": "mid-shaft",
            "label": "Humeral shaft",
            "description": "May fracture after direct trauma or torsion.",
            "position": {"x": 0.26, "y": 0.55, "z": 0.22},
        },
        {
            "id": "distal-humerus",
            "label": "Distal humerus",
            "description": "Can involve supracondylar and articular areas.",
            "position": {"x": 0.18, "y": -1.05, "z": 0.20},
        },
    ],
    "wrist": [
        {
            "id": "distal-radius",
            "label": "Distal radius",
            "description": "One of the most common fracture sites after extension trauma.",
            "position": {"x": 0.18, "y": 0.20, "z": 0.10},
        },
        {
            "id": "scaphoid",
            "label": "Scaphoid",
            "description": "Typical location with tenderness in the anatomic snuffbox.",
            "position": {"x": -0.24, "y": 0.45, "z": 0.12},
        },
        {
            "id": "ulnar-styloid",
            "label": "Ulnar styloid",
            "description": "May be associated with ulnocarpal complex trauma.",
            "position": {"x": 0.30, "y": -0.25, "z": 0.14},
        },
    ],
    "hand": [
        {
            "id": "fifth-metacarpal",
            "label": "Fifth metacarpal base",
            "description": "Frequent area in direct-impact trauma.",
            "position": {"x": 0.26, "y": 0.12, "z": 0.08},
        },
        {
            "id": "proximal-phalanx",
            "label": "Proximal phalanx",
            "description": "Can be involved in sports-related trauma.",
            "position": {"x": -0.18, "y": 0.68, "z": 0.08},
        },
        {
            "id": "carpometacarpal",
            "label": "Carpometacarpal joint",
            "description": "Useful region for educational anatomic orientation.",
            "position": {"x": -0.06, "y": -0.32, "z": 0.10},
        },
    ],
}

QUADRANT_FOCUS_MAP = {
    "humerus": {
        "upper_left": "surgical-neck",
        "upper_right": "surgical-neck",
        "lower_left": "distal-humerus",
        "lower_right": "mid-shaft",
    },
    "wrist": {
        "upper_left": "scaphoid",
        "upper_right": "distal-radius",
        "lower_left": "ulnar-styloid",
        "lower_right": "distal-radius",
    },
    "hand": {
        "upper_left": "proximal-phalanx",
        "upper_right": "fifth-metacarpal",
        "lower_left": "carpometacarpal",
        "lower_right": "fifth-metacarpal",
    },
}


def infer_region_from_filename(filename):
    name = (filename or "").lower()
    if any(token in name for token in ["wri", "wrist", "polso", "carp"]):
        return "wrist"
    if any(token in name for token in ["hand", "mano", "metacarp", "phal", "finger"]):
        return "hand"
    if any(token in name for token in ["humer", "omero"]):
        return "humerus"
    return "humerus"


def resolve_model_config(region):
    region_key = region if region in MODEL_LIBRARY else "humerus"
    model_cfg = MODEL_LIBRARY[region_key].copy()
    model_abs = os.path.join(BASE_DIR, model_cfg["url"].lstrip("/"))
    if not os.path.exists(model_abs):
        region_key = "humerus"
        model_cfg = MODEL_LIBRARY[region_key].copy()

    model_cfg["region"] = region_key
    model_cfg["region_label"] = REGION_LABELS.get(region_key, "Omero")
    model_cfg["frequent_sites"] = FREQUENT_SITES.get(region_key, [])
    return model_cfg


def quadrant_from_box(box):
    cx = (box["x1"] + box["x2"]) / 2
    cy = (box["y1"] + box["y2"]) / 2
    horizontal = "left" if cx <= 0.5 else "right"
    vertical = "upper" if cy <= 0.5 else "lower"
    return f"{vertical}_{horizontal}"


def human_quadrant_label(quadrant):
    mapping = {
        "upper_left": "upper-left quadrant",
        "upper_right": "upper-right quadrant",
        "lower_left": "lower-left quadrant",
        "lower_right": "lower-right quadrant",
    }
    return mapping.get(quadrant, "undefined quadrant")


def site_label_for(region, site_id):
    sites = FREQUENT_SITES.get(region, [])
    for site in sites:
        if site["id"] == site_id:
            return site["label"]
    return "educational site"


def build_ai_support(fracture_boxes, region):
    if not fracture_boxes:
        return (
            "No area above threshold detected. Use the 3D viewer as an educational anatomy atlas.",
            "",
            "",
        )

    best_box = max(fracture_boxes, key=lambda b: b.get("score", 0.0))
    quadrant = quadrant_from_box(best_box)
    focus_id = QUADRANT_FOCUS_MAP.get(region, {}).get(quadrant, "")
    focus_label = site_label_for(region, focus_id)
    text = (
        f"Suspected fracture in the {human_quadrant_label(quadrant)} of the X-ray. "
        f"The 3D viewer opens the corresponding educational focus: {focus_label}."
    )
    return text, quadrant, focus_id

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/", methods=["GET", "POST"])
def index():
    original_image = None
    result_image = None
    accuracy = None
    confidences = []
    fracture_boxes = []
    selected_region = "humerus"
    anatomy_input = "auto"
    ai_support_text = "Upload an X-ray to get an educational hint linked to the 3D Explorer."
    ai_quadrant = ""
    ai_focus_id = ""

    if request.method == "POST":
        file = request.files.get("file")
        if not file or file.filename == "" or not allowed_file(file.filename):
            return "Invalid file"

        anatomy_input = (request.form.get("anatomy_region", "auto") or "auto").strip().lower()
        if anatomy_input not in {"auto", *REGION_LABELS.keys()}:
            anatomy_input = "auto"

        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        original_image = filename

        selected_region = infer_region_from_filename(filename) if anatomy_input == "auto" else anatomy_input

        results = model.predict(filepath, imgsz=256, device="cpu", verbose=False)[0]

        img = cv2.imread(filepath)
        img_pred = img.copy()
        max_score = 0.0
        threshold = 0.05
        
        img_h, img_w = img.shape[:2]

        for box in results.boxes.data.tolist():
            x1, y1, x2, y2, score, class_id = box
            if score > threshold:
                max_score = max(max_score, score)
                confidences.append(round(float(score), 2))
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                
                norm_x1, norm_y1 = x1 / img_w, y1 / img_h
                norm_x2, norm_y2 = x2 / img_w, y2 / img_h
                fracture_boxes.append({
                    "x1": round(norm_x1, 3),
                    "y1": round(norm_y1, 3),
                    "x2": round(norm_x2, 3),
                    "y2": round(norm_y2, 3),
                    "score": round(float(score), 3)
                })
                
                class_name = CLASS_NAMES[int(class_id)]
                cv2.rectangle(img_pred, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(img_pred, class_name, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        accuracy = round(max_score * 100, 2) if max_score > 0 else None
        result_path = os.path.join(RESULT_FOLDER, filename)
        cv2.imwrite(result_path, img_pred)
        result_image = filename
        ai_support_text, ai_quadrant, ai_focus_id = build_ai_support(fracture_boxes, selected_region)

    confidences = confidences or []
    fracture_boxes = fracture_boxes or []
    return render_template("index.html",
                           original_image=original_image,
                           result_image=result_image,
                           accuracy=accuracy,
                           confidences=confidences,
                           fracture_boxes=fracture_boxes,
                           selected_region=selected_region,
                           anatomy_input=anatomy_input,
                           region_labels=REGION_LABELS,
                           ai_support_text=ai_support_text,
                           ai_quadrant=ai_quadrant,
                           ai_focus_id=ai_focus_id)

@app.route("/uploads/<filename>")
def send_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/results/<filename>")
def send_result(filename):
    return send_from_directory(RESULT_FOLDER, filename)

@app.route("/signin")
def signin():
    return "Sign In page"

@app.route("/signup")
def signup():
    return "Sign Up page"

@app.route("/viewer-3d")
def viewer_3d():
    region = (request.args.get("region") or "humerus").strip().lower()
    focus_id = (request.args.get("focus") or "").strip().lower()
    quadrant = (request.args.get("quadrant") or "").strip().lower()

    model_config = resolve_model_config(region)
    valid_focus_ids = {site["id"] for site in model_config["frequent_sites"]}
    if focus_id not in valid_focus_ids:
        focus_id = model_config["frequent_sites"][0]["id"] if model_config["frequent_sites"] else ""

    return render_template(
        "viewer3d.html",
        model_config=model_config,
        initial_focus_id=focus_id,
        ai_quadrant_label=human_quadrant_label(quadrant) if quadrant else "",
    )

if __name__ == "__main__":
    app.run(debug=True)
