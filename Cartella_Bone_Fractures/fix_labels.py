import os

label_dirs = [
    "/workspaces/MedVisionAI/dataset_completo/train/labels",
    "/workspaces/MedVisionAI/dataset_completo/valid/labels"
]

for labels_dir in label_dirs:
    for file in os.listdir(labels_dir):
        if file.endswith(".txt"):
            path = os.path.join(labels_dir, file)
            new_lines = []
            with open(path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) > 0:
                        parts[0] = "0" 
                        new_lines.append(" ".join(parts))
            with open(path, "w") as f:
                f.write("\n".join(new_lines))

print("Tutte le classi sono state rimappate a 0 (Fracture).")
