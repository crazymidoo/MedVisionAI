document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const previewContainer = document.getElementById("preview-container");
  const form = fileInput ? fileInput.closest("form") : null;
  const resultImage = document.getElementById("result-image");
  const downloadBtn = document.getElementById("download-pdf");
  const toggleBtn = document.querySelector('.toggle-theme');
  const kpiPills = Array.from(document.querySelectorAll('.kpi-pill'));
  const chartCanvas = document.getElementById("confidenceChart");
  const viewer3dButton = document.getElementById("view-3d");
  const viewer3dModal = document.getElementById("viewer3d-modal");
  const viewer3dCanvas = document.getElementById("viewer3d-canvas");
  const close3dButton = document.getElementById("close-3d");
  const initialPreviewMarkup = previewContainer ? previewContainer.innerHTML : "";
  let confidenceChart = null;

  const getChartTheme = () => {
    const dark = document.body.classList.contains("dark");
    return {
      bars: dark ? "rgba(88, 169, 255, 0.72)" : "rgba(43, 143, 230, 0.72)",
      tick: dark ? "#a7bbd4" : "#5b6f88",
      grid: dark ? "rgba(167,187,212,0.20)" : "rgba(91,111,136,0.18)",
      tooltipBg: dark ? "#0f1a2a" : "#ffffff",
      tooltipText: dark ? "#dbe8f8" : "#162133"
    };
  };

  const renderConfidenceChart = () => {
    if (!chartCanvas || typeof Chart === "undefined") return;
    const confidences = window.confidences || [];
    if (!confidences.length) return;
    if (confidenceChart) confidenceChart.destroy();

    const palette = getChartTheme();
    confidenceChart = new Chart(chartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: confidences.map((_, i) => `Box ${i + 1}`),
        datasets: [{
          label: "Confidence",
          data: confidences,
          backgroundColor: confidences.map(() => palette.bars),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            titleColor: palette.tooltipText,
            bodyColor: palette.tooltipText,
            callbacks: { label: ctx => (ctx.raw * 100).toFixed(1) + "%" }
          }
        },
        scales: {
          x: { ticks: { color: palette.tick }, grid: { color: palette.grid } },
          y: {
            min: 0,
            max: 1,
            ticks: { color: palette.tick, callback: v => (v * 100).toFixed(0) + "%" },
            grid: { color: palette.grid }
          }
        }
      }
    });
  };

  if (toggleBtn) {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.classList.add("dark");
    const updateButtonText = () => { toggleBtn.textContent = document.body.classList.contains("dark") ? "Light" : "Dark"; };
    updateButtonText();
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      updateButtonText();
      renderConfidenceChart();
    });
  }

  if (kpiPills.length) {
    if ("IntersectionObserver" in window) {
      const kpiObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            kpiObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });

      kpiPills.forEach((pill, index) => {
        pill.style.transitionDelay = `${index * 80}ms`;
        kpiObserver.observe(pill);
      });
    } else {
      kpiPills.forEach((pill, index) => {
        pill.style.transitionDelay = `${index * 80}ms`;
        pill.classList.add("is-visible");
      });
    }
  }

  if (dropZone) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
    dropZone.addEventListener("drop", e => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) { fileInput.files = e.dataTransfer.files; showPreview(file); }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        showPreview(fileInput.files[0]);
      } else if (previewContainer) {
        previewContainer.innerHTML = initialPreviewMarkup;
      }
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
    reader.onload = e => {
      img.src = e.target.result;
      wrapper.appendChild(label);
      wrapper.appendChild(img);
      previewContainer.appendChild(wrapper);
      if (window.panzoom) panzoom(img, {maxScale:6, contain:'outside'});
    };
    reader.readAsDataURL(file);
  }

  if (form) form.addEventListener("submit", () => {
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

  function init3DViewer() {
    if (!viewer3dButton || !viewer3dModal || !viewer3dCanvas) return;

    let renderer = null;
    let scene = null;
    let camera = null;
    let controls = null;
    let frameId = null;

    const closeTargets = Array.from(viewer3dModal.querySelectorAll('[data-close-3d]'));

    const getFractureIntensity = () => {
      const confidences = window.confidences || [];
      if (!confidences.length) return 0.55;
      const avg = confidences.reduce((sum, val) => sum + val, 0) / confidences.length;
      return Math.max(0.35, Math.min(0.95, avg));
    };

    const buildBoneModel = () => {
      const group = new THREE.Group();
      const intensity = getFractureIntensity();

      const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xecf3ff,
        roughness: 0.42,
        metalness: 0.05
      });

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.46, 7.2, 48), boneMaterial);
      shaft.rotation.z = 0.12;
      group.add(shaft);

      const headTop = new THREE.Mesh(new THREE.SphereGeometry(0.95, 42, 28), boneMaterial);
      headTop.position.set(0.18, 3.45, 0);
      group.add(headTop);

      const headBottom = new THREE.Mesh(new THREE.SphereGeometry(0.84, 42, 28), boneMaterial);
      headBottom.position.set(-0.09, -3.25, 0);
      group.add(headBottom);

      const fractureArc = new THREE.TorusGeometry(0.73, 0.05 + intensity * 0.025, 12, 64, Math.PI * (0.9 + intensity * 0.4));
      const fractureMat = new THREE.MeshStandardMaterial({
        color: 0xff4d4f,
        emissive: 0xb82022,
        emissiveIntensity: 0.35 + intensity * 0.45,
        roughness: 0.34
      });
      const crack = new THREE.Mesh(fractureArc, fractureMat);
      crack.position.set(0.02, -0.4, 0.15);
      crack.rotation.set(0.2, 0.6, 0.2);
      group.add(crack);

      const glow = new THREE.PointLight(0xff7a7b, 0.8 + intensity, 4.2);
      glow.position.set(0.85, -0.15, 1.2);
      group.add(glow);

      return group;
    };

    const handleResize = () => {
      if (!renderer || !camera) return;
      const width = viewer3dCanvas.clientWidth;
      const height = viewer3dCanvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const stopViewer = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = null;

      if (controls) controls.dispose();
      controls = null;

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode === viewer3dCanvas) {
          viewer3dCanvas.removeChild(renderer.domElement);
        }
      }
      renderer = null;
      scene = null;
      camera = null;
      window.removeEventListener("resize", handleResize);
    };

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (controls) controls.update();
      if (scene && camera && renderer) renderer.render(scene, camera);
    };

    const openViewer = () => {
      if (typeof THREE === "undefined") {
        alert("Viewer 3D non disponibile al momento.");
        return;
      }
      if (renderer) return;

      viewer3dModal.classList.add("open");
      viewer3dModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      scene = new THREE.Scene();
      scene.background = new THREE.Color(document.body.classList.contains("dark") ? 0x0f1a2b : 0xeff6ff);

      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 10.5);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      viewer3dCanvas.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xe6f2ff, 0x203045, 1.05);
      scene.add(ambient);

      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(4, 4, 6);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xaad4ff, 0.55);
      fill.position.set(-3, -2, 4);
      scene.add(fill);

      scene.add(buildBoneModel());

      if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.minDistance = 6;
        controls.maxDistance = 18;
      }

      handleResize();
      window.addEventListener("resize", handleResize);
      animate();
    };

    const closeViewer = () => {
      viewer3dModal.classList.remove("open");
      viewer3dModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      stopViewer();
    };

    viewer3dButton.addEventListener("click", openViewer);
    closeTargets.forEach(node => node.addEventListener("click", closeViewer));
    if (close3dButton) close3dButton.addEventListener("click", closeViewer);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && viewer3dModal.classList.contains("open")) closeViewer();
    });
  }

  async function initResultInteractions(){
    if (!resultImage) return;
    resultImage.style.cursor = "grab";
    resultImage.addEventListener("dblclick", async () => { if (resultImage.requestFullscreen) await resultImage.requestFullscreen(); });

    async function imageToDataURL(imgEl){
      if (!imgEl.src) throw new Error("No image source");
      return await new Promise((resolve, reject) => {
        const tmp = new Image();
        tmp.crossOrigin = "anonymous";
        tmp.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = tmp.naturalWidth; canvas.height = tmp.naturalHeight; canvas.getContext("2d").drawImage(tmp, 0, 0); resolve(canvas.toDataURL("image/jpeg", 0.92)); } catch (err) { reject(err); } };
        tmp.onerror = e => reject(e);
        tmp.src = imgEl.src;
      });
    }

    if (downloadBtn){
      downloadBtn.addEventListener("click", async e => {
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
        } catch (err) { console.error(err); alert("Errore nella creazione del PDF. Controlla la console."); }
        finally { downloadBtn.disabled = false; downloadBtn.textContent = "Download PDF"; }
      });
    }

    if (window.panzoom) { const pz = panzoom(resultImage, { maxScale: 8, minScale: 1, contain: 'outside' }); resultImage.addEventListener("dblclick", () => pz.zoomAbs(0,0,1)); }
  }

  if (typeof Intense !== "undefined") try{ new Intense(document.querySelectorAll('.intense')); } catch(e){}

  renderConfidenceChart();
  init3DViewer();

  initResultInteractions();
});
