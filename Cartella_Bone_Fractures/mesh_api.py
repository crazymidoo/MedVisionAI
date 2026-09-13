"""FastAPI service for generating a 3D fracture mesh from 2D inputs."""

import json
import tempfile
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

try:
    from .fracture_mesh import mask_from_box, write_obj_from_mask
except ImportError:
    from fracture_mesh import mask_from_box, write_obj_from_mask

BASE_DIR = Path(__file__).resolve().parent
MESH_FOLDER = BASE_DIR / "results" / "meshes"
MESH_FOLDER.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="MedVisionAI Fracture Mesh API", version="1.0.0")
app.mount("/meshes", StaticFiles(directory=MESH_FOLDER), name="meshes")


@app.post("/api/fracture-mesh")
async def create_fracture_mesh(
    image: UploadFile = File(...),
    mask: UploadFile | None = File(default=None),
    box: str | None = Form(default=None),
):
    """Create an OBJ from a segmentation mask or normalized detection box."""
    image_bytes = await image.read()
    image_array = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    if image_array is None:
        raise HTTPException(status_code=400, detail="image must be a readable raster file")

    if mask is not None:
        mask_bytes = await mask.read()
        mask_array = cv2.imdecode(np.frombuffer(mask_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        if mask_array is None:
            raise HTTPException(status_code=400, detail="mask must be a readable raster file")
        binary_mask = mask_array > 0
    elif box:
        try:
            binary_mask = mask_from_box(json.loads(box), *image_array.shape)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise HTTPException(status_code=400, detail=f"invalid box JSON: {error}") from error
    else:
        raise HTTPException(status_code=400, detail="send either mask or box")

    stem = Path(image.filename or "fracture").stem.replace(" ", "_")
    output_path = MESH_FOLDER / f"{stem}.obj"
    mesh = write_obj_from_mask(binary_mask, output_path)
    mesh["url"] = f"/meshes/{output_path.name}"
    return mesh


@app.get("/health")
def health():
    return {"status": "ok", "service": "fracture-mesh"}
