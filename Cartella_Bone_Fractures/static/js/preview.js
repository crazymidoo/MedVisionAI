document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("file-input");
    const previewContainer = document.getElementById("preview-container");
    const form = fileInput.closest("form");
    const resultImage = document.getElementById("result-image");
    const downloadBtn = document.getElementById("download-pdf");

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

    form.addEventListener("submit", () => {
        let spinnerContainer = document.createElement("div");
        spinnerContainer.id = "loading-spinner";
        spinnerContainer.style.display = "flex";
        spinnerContainer.style.alignItems = "center";
        spinnerContainer.style.gap = "10px";
        spinnerContainer.style.marginTop = "20px";

        let spinner = document.createElement("div");
        spinner.style.border = "4px solid #f3f3f3";
        spinner.style.borderTop = "4px solid #3498db";
        spinner.style.borderRadius = "50%";
        spinner.style.width = "24px";
        spinner.style.height = "24px";
        spinner.style.animation = "spin 1s linear infinite";

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

    const style = document.createElement('style');
    style.innerHTML = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }`;
    document.head.appendChild(style);
});
