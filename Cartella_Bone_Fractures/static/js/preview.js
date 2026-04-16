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
    let boneModel = null;

    const closeTargets = Array.from(viewer3dModal.querySelectorAll('[data-close-3d]'));

    const buildBoneModel = () => {
      const group = new THREE.Group();
      const fractureBoxes = window.fractureBoxes || [];

      // Materiale osso realistico (avorio/beige chiaro)
      const boneMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8dcc8,
        roughness: 0.65,
        metalness: 0,
        map: null,
        side: THREE.FrontSide
      });

      // Costruisci shaft dell'osso con forma più realistica
      const shaftGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.55, 0),
          new THREE.Vector2(0.62, 1.5),
          new THREE.Vector2(0.68, 3.0),
          new THREE.Vector2(0.72, 5.0),
          new THREE.Vector2(0.68, 6.0),
          new THREE.Vector2(0.58, 7.0),
          new THREE.Vector2(0.45, 7.8),
          new THREE.Vector2(0.38, 8.0),
          new THREE.Vector2(0.0, 8.0)
        ],
        128
      );
      shaftGeo.computeVertexNormals();
      const shaft = new THREE.Mesh(shaftGeo, boneMaterial);
      shaft.position.y = -3.0;
      group.add(shaft);

      // Aggiungi trama procedurale
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#e8dcc8";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 800; i++) {
        ctx.strokeStyle = `rgba(180,165,140,${Math.random() * 0.15})`;
        ctx.lineWidth = Math.random() * 0.5;
        const x1 = Math.random() * 256;
        const y1 = Math.random() * 256;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.random() * 40 - 20, y1 + Math.random() * 40 - 20);
        ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      boneMaterial.map = texture;
      boneMaterial.needsUpdate = true;

      // Articolazioni (epifisi)
      const articEpiseMat = new THREE.MeshStandardMaterial({
        color: 0xd4c9b8,
        roughness: 0.55,
        metalness: 0.02
      });

      const headTopGeo = new THREE.SphereGeometry(0.95, 48, 24);
      const headTop = new THREE.Mesh(headTopGeo, articEpiseMat);
      headTop.position.set(0, 4.8, 0);
      group.add(headTop);

      const headBottomGeo = new THREE.SphereGeometry(0.82, 48, 24);
      const headBottom = new THREE.Mesh(headBottomGeo, articEpiseMat);
      headBottom.position.set(0, -4.6, 0);
      group.add(headBottom);

      // Renderizza le fratture rilevate da AI
      if (fractureBoxes.length > 0) {
        fractureBoxes.forEach((box, idx) => {
          const cx = (box.x1 + box.x2) / 2;
          const cy = 1 - (box.y1 + box.y2) / 2;
          
          // Mappa su coordinate osso
          const posX = (cx - 0.5) * 1.8;
          const posY = (cy - 0.5) * 8.5 - 3;
          const posZ = (Math.random() - 0.5) * 0.3;
          
          const fractureWidth = Math.abs(box.x2 - box.x1);
          const fractureLen = Math.abs(box.y2 - box.y1);
          
          // Crepa: cilindro con estrusione lungo superficie osso
          const crackGeo = new THREE.BufferGeometry();
          const crackPoints = [];
          const resolution = 32;
          
          for (let i = 0; i < resolution; i++) {
            const t = i / (resolution - 1);
            const depth = Math.sin(t * Math.PI) * (0.12 + box.score * 0.08);
            const x = (t - 0.5) * (fractureWidth * 2.5) + posX;
            const y = Math.sin(t * Math.PI * 2) * 0.04;
            const z = posZ + depth;
            crackPoints.push(x, posY + y, z);
          }
          
          crackGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(crackPoints), 3));
          crackGeo.computeVertexNormals();
          
          const crackMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            emissive: 0xff4444,
            emissiveIntensity: 0.35 + box.score * 0.45,
            roughness: 0.9,
            metalness: 0,
            side: THREE.DoubleSide
          });
          
          const crack = new THREE.Line(crackGeo, new THREE.LineBasicMaterial({
            color: 0xff6b5b,
            linewidth: 3 + box.score * 2,
            emissive: 0xff6b5b
          }));
          group.add(crack);

          // Highlight zone attorno frattura
          const highlightGeo = new THREE.CylinderGeometry(
            0.55 + fractureWidth * 1.2,
            0.55 + fractureWidth * 1.2,
            fractureLen * 8,
            32
          );
          
          const highlightMat = new THREE.MeshStandardMaterial({
            color: 0xff8873,
            emissive: 0xff4444,
            emissiveIntensity: 0.2 + box.score * 0.3,
            transparent: true,
            opacity: 0.08 + box.score * 0.12,
            wireframe: false
          });
          
          const highlight = new THREE.Mesh(highlightGeo, highlightMat);
          highlight.position.copy(crack.position);
          highlight.position.z = posZ;
          group.add(highlight);
        });
      } else {
        // Defaults: frattura illustrativa
        const crackGeo = new THREE.BufferGeometry();
        const crackPts = [];
        for (let i = 0; i < 32; i++) {
          const t = i / 31;
          const x = (t - 0.5) * 1.2;
          const y = Math.sin(t * Math.PI * 3) * 0.03;
          const z = Math.sin(t * Math.PI) * 0.15;
          crackPts.push(x, y - 1.2, z);
        }
        crackGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(crackPts), 3));
        
        const crackMat = new THREE.LineBasicMaterial({
          color: 0xff6b5b,
          linewidth: 2.5
        });
        const crack = new THREE.Line(crackGeo, crackMat);
        group.add(crack);
      }

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
      if (controls) {
        controls.update();
      } else if (boneModel && boneModel.userData.autoRotate) {
        boneModel.rotation.x += 0.004;
        boneModel.rotation.y += 0.006;
      }
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
      scene.background = new THREE.Color(document.body.classList.contains("dark") ? 0x0a0e1a : 0xf5f7fa);

      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 14);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowShadowMap;
      viewer3dCanvas.appendChild(renderer.domElement);

      // Illuminazione clinica/professionale
      const amb = new THREE.AmbientLight(0xf0f2f5, 0.55);
      scene.add(amb);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
      keyLight.position.set(5.5, 6.2, 8.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.bias = -0.00015;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xcce5ff, 0.65);
      fillLight.position.set(-4.2, -2.8, 5);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffe5cc, 0.35);
      rimLight.position.set(0, -1.5, -8);
      scene.add(rimLight);

      // Luci speculative su fratture
      const fractureLights = [];
      const fractureBoxes = window.fractureBoxes || [];
      if (fractureBoxes.length > 0) {
        fractureBoxes.slice(0, 3).forEach((box) => {
          const fLight = new THREE.PointLight(0xff6b5b, 0.55, 6.5);
          const cx = (box.x1 + box.x2) / 2;
          const cy = 1 - (box.y1 + box.y2) / 2;
          fLight.position.set(
            (cx - 0.5) * 1.8,
            (cy - 0.5) * 8.5 - 3 + 1.5,
            2.0
          );
          scene.add(fLight);
          fractureLights.push(fLight);
        });
      }

      boneModel = buildBoneModel();
      boneModel.castShadow = true;
      boneModel.receiveShadow = true;
      scene.add(boneModel);

      if (typeof OrbitControls !== "undefined") {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.minDistance = 6;
        controls.maxDistance = 18;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.8;
      } else {
        console.warn("OrbitControls non caricato, uso fallback auto-rotation");
        boneModel.userData.autoRotate = true;
      }

      handleResize();
      window.addEventListener("resize", handleResize);
      
      if (renderer && renderer.domElement) {
        renderer.domElement.addEventListener("mousedown", onMouseDown);
        renderer.domElement.addEventListener("mouseup", onMouseUp);
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("wheel", onMouseWheel, { passive: false });
      }
      
      animate();
    };

    const closeViewer = () => {
      viewer3dModal.classList.remove("open");
      viewer3dModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("mousemove", onMouseMove);
        renderer.domElement.removeEventListener("wheel", onMouseWheel);
      }
      stopViewer();
    };

    let mouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseDown = (e) => { mouseDown = true; mouseX = e.clientX; mouseY = e.clientY; };
    const onMouseUp = () => { mouseDown = false; };
    const onMouseMove = (e) => {
      if (!mouseDown || !boneModel || controls) return;
      const deltaX = e.clientX - mouseX;
      const deltaY = e.clientY - mouseY;
      boneModel.rotation.x += deltaY * 0.005;
      boneModel.rotation.y += deltaX * 0.005;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onMouseWheel = (e) => {
      if (!camera) return;
      e.preventDefault();
      const zoomSpeed = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      const currentZ = camera.position.z;
      camera.position.z = Math.max(6, Math.min(18, currentZ + zoomSpeed * direction));
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
