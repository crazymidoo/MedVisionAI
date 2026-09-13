"""Create a small 3D fracture mesh from a 2D segmentation mask."""

from pathlib import Path

import numpy as np
from skimage.measure import marching_cubes


def mask_from_box(box: dict, height: int, width: int) -> np.ndarray:
    """Build a binary mask from normalized x1/y1/x2/y2 coordinates."""
    mask = np.zeros((height, width), dtype=np.uint8)
    x1 = max(0, min(width - 1, int(round(float(box["x1"]) * width))))
    y1 = max(0, min(height - 1, int(round(float(box["y1"]) * height))))
    x2 = max(x1 + 1, min(width, int(round(float(box["x2"]) * width))))
    y2 = max(y1 + 1, min(height, int(round(float(box["y2"]) * height))))
    mask[y1:y2, x1:x2] = 1
    return mask


def center_from_mask(mask: np.ndarray) -> dict:
    """Return the normalized center used by the browser pin."""
    rows, cols = np.where(mask > 0)
    if not len(rows):
        return {"x": 0.0, "y": 0.0, "z": 0.0}
    return {
        "x": round(float(cols.mean() / max(mask.shape[1] - 1, 1) * 2 - 1), 4),
        "y": round(float(1 - rows.mean() / max(mask.shape[0] - 1, 1) * 2), 4),
        "z": 0.0,
    }


def write_obj_from_mask(mask: np.ndarray, output_path: str | Path, depth: int = 8) -> dict:
    """Extrude a 2D mask and polygonize it with Marching Cubes into OBJ."""
    binary_mask = (np.asarray(mask) > 0).astype(np.float32)
    if binary_mask.ndim != 2 or not binary_mask.any():
        raise ValueError("The fracture mask must be a non-empty 2D array")

    depth = max(3, int(depth))
    volume = np.zeros((depth + 2, *binary_mask.shape), dtype=np.float32)
    volume[1:-1] = binary_mask
    vertices, faces, _, _ = marching_cubes(volume, level=0.5)

    height, width = binary_mask.shape
    vertices[:, 0] = 1 - vertices[:, 0] / max(height - 1, 1) * 2
    vertices[:, 1] = vertices[:, 1] / max(width - 1, 1) * 2 - 1
    vertices[:, 2] = vertices[:, 2] / max(depth + 1, 1) * 0.8 - 0.4

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as obj:
        obj.write("# MedVisionAI fracture mesh generated with Marching Cubes\n")
        for x, y, z in vertices:
            obj.write(f"v {x:.6f} {y:.6f} {z:.6f}\n")
        for a, b, c in faces + 1:
            obj.write(f"f {a} {b} {c}\n")

    return {
        "mesh_path": str(output),
        "point": center_from_mask(binary_mask),
        "vertex_count": int(len(vertices)),
        "face_count": int(len(faces)),
    }
