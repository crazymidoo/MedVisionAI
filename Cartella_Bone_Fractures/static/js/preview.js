document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("preview-container");
    const form = fileInput.closest("form");
    const resultImage = document.getElementById("result-image");
    const downloadBtn = document.getElementById("download-pdf");

    function showPreview(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = '';
            const img = document.createElement("img");
            img.src = e.target.result;
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            showPreview(fileInput.files[0]);
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            showPreview(fileInput.files[0]);
        }
    });

    form.addEventListener("submit", () => {
        let spinnerContainer = document.createElement("div");
        spinnerContainer.id = "loading-spinner";

        let spinner = document.createElement("div");
        let text = document.createElement("span");
        text.textContent = "Processing...";

        spinnerContainer.appendChild(spinner);
        spinnerContainer.appendChild(text);
        previewContainer.appendChild(spinnerContainer);
    });

    if (resultImage) {
        resultImage.style.cursor = "zoom-in";
        resultImage.addEventListener("click", () => {
            if (resultImage.requestFullscreen) {
                resultImage.requestFullscreen();
            } else if (resultImage.mozRequestFullScreen) {
                resultImage.mozRequestFullScreen();
            } else if (resultImage.webkitRequestFullscreen) {
                resultImage.webkitRequestFullscreen();
            } else if (resultImage.msRequestFullscreen) {
                resultImage.msRequestFullscreen();
            }
        });
    }

    if (resultImage && downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const imgProps = pdf.getImageProperties(resultImage);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            let widthRatio = pdfWidth / imgProps.width;
            let heightRatio = pdfHeight / imgProps.height;
            let ratio = Math.min(widthRatio, heightRatio);

            const imgWidth = imgProps.width * ratio;
            const imgHeight = imgProps.height * ratio;

            const xOffset = (pdfWidth - imgWidth) / 2;
            const yOffset = (pdfHeight - imgHeight) / 2;

            pdf.addImage(resultImage, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
            pdf.save("result.pdf");
        });
    }

    new Intense('.intense');
});
