document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("preview-container");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = '';
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.maxWidth = "400px";
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});
