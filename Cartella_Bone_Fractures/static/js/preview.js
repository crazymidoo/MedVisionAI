document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const previewContainer = document.getElementById("preview-container");
  const form = fileInput.closest("form");
  const resultImage = document.getElementById("result-image");
  const downloadBtn = document.getElementById("download-pdf");
  const toggleThemeBtn = createThemeToggle();

  attachDropHandlers();
  attachFileChange();
  attachSubmitHandler();
  initResultInteractions();
  if (typeof Intense !== "undefined") initIntense();

  function attachDropHandlers(){
    if (!dropZone) return;
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
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) {
        fileInput.files = e.dataTransfer.files;
        showPreview(file);
      }
    });
  }

  function attachFileChange(){
    if (!fileInput) return;
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) showPreview(fileInput.files[0]);
    });
  }

  function showPreview(file){
    if (!file) return;
    previewContainer.innerHTML = "";
    const reader = new FileReader();
    const wrapper = document.createElement("div");
    wrapper.className = "preview";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Preview";
    const img = document.createElement("img");
    img.alt = file.name;
    img.loading = "lazy";

    reader.onload = (e) => {
      img.src = e.target.result;
      wrapper.appendChild(label);
      wrapper.appendChild(img);
      previewContainer.appendChild(wrapper);
      if (window.panzoom) panzoom(img, {maxScale:6, contain:'outside'});
    };
    reader.readAsDataURL(file);
  }

  function attachSubmitHandler(){
    if (!form) return;
    form.addEventListener("submit", () => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('disabled');
        const spinner = document.createElement("span");
        spinner.className = "loading";
        spinner.innerHTML = `<span class="spinner" aria-hidden="true"></span><span class="helper">Analisi in corso...</span>`;
        submitBtn.parentNode && submitBtn.parentNode.appendChild(spinner);
      }
    });
  }

  async function initResultInteractions(){
    if (!resultImage) return;

    resultImage.style.cursor = "grab";

    resultImage.addEventListener("dblclick", async () => {
      if (resultImage.requestFullscreen) await resultImage.requestFullscreen();
    });

    async function imageToDataURL(imgEl){
      if (!imgEl.src) throw new Error("No image source");

      return await new Promise((resolve, reject) => {
        const tmp = new Image();
        tmp.crossOrigin = "anonymous";
        tmp.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = tmp.naturalWidth;
            canvas.height = tmp.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(tmp, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
          } catch (err) { reject(err); }
        };
        tmp.onerror = (e) => reject(e);
        tmp.src = imgEl.src;
        
      });
    }

    if (downloadBtn){
      downloadBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        downloadBtn.disabled = true;
        downloadBtn.textContent = "Preparazione PDF…";
        try {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

          const dataURL = await imageToDataURL(resultImage);
          const imgProps = pdf.getImageProperties(dataURL);
          const pdfWidth = pdf.internal.pageSize.getWidth() - 20; 
          const ratio = Math.min(pdfWidth / imgProps.width, (pdf.internal.pageSize.getHeight() - 60) / imgProps.height);
          const imgWidth = imgProps.width * ratio;
          const imgHeight = imgProps.height * ratio;
          const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
          const y = 30;

          
          pdf.setFontSize(16);
          pdf.text("Fracture Detection Report", 14, 16);
          pdf.setFontSize(11);
          const accText = document.querySelector(".meta .value") ? document.querySelector(".meta .value").textContent : "";
          pdf.text(`Risultato: ${accText}`, 14, 24);
          
          pdf.addImage(dataURL, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
          pdf.save("fracture_report.pdf");
        } catch (err) {
          console.error(err);
          alert("Errore nella creazione del PDF. Controlla la console.");
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = "Download PDF";
        }
      });
    }

    
    if (window.panzoom) {
      const pz = panzoom(resultImage, { maxScale: 8, minScale: 1, contain: 'outside' });
     
      resultImage.addEventListener("dblclick", () => pz.zoomAbs(0,0,1));
    }
  }

  function initIntense(){
    try{ new Intense(document.querySelectorAll('.intense')); } catch(e){/* ignore */ }
  }

  function createThemeToggle(){
    const btn = document.createElement("button");
    btn.className = "btn secondary";
    btn.style.marginLeft = "8px";
    btn.textContent = "Dark";
    btn.title = "Toggle theme";
    const header = document.querySelector(".header");
    if (header) header.appendChild(btn);

    const apply = () => {
      if (document.body.classList.contains("dark")) {
        btn.textContent = "Light";
      } else {
        btn.textContent = "Dark";
      }
    };

    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      apply();
    });
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add("dark");
    }
    apply();
    return btn;
  }
});
