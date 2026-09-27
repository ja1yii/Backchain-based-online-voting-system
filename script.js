(function () {
  "use strict";

  const CANDIDATES = [
    { id: "c1", name: "Meera Kulkarni", party: "Unity Party", color: "#2F7A5C", votes: 128 },
    { id: "c2", name: "Rohan Deshpande", party: "Progress Alliance", color: "#A9821A", votes: 96 },
    { id: "c3", name: "Farhan Sheikh", party: "Civic Front", color: "#3D5A80" },
  ];
  CANDIDATES[2].votes = 74;

  const state = {
    step: 1,
    voterName: "",
    voterId: "",
    faceVerified: false,
    otpCode: "",
    selectedCandidate: null,
    stream: null,
  };

  const views = document.querySelectorAll(".stage-view");
  const dots = document.querySelectorAll(".dot");

  function goToStep(step) {
    state.step = step;
    views.forEach((v) => v.classList.toggle("is-active", Number(v.dataset.view) === step));
    dots.forEach((d) => {
      const n = Number(d.dataset.step);
      d.classList.toggle("is-active", n === step);
      d.classList.toggle("is-done", n < step);
    });
  }

  // ---- Step 1: Register ----
  const nameInput = document.getElementById("voter-name");
  const idInput = document.getElementById("voter-id");
  const registerError = document.getElementById("register-error");

  document.getElementById("btn-start").addEventListener("click", () => {
    const name = nameInput.value.trim();
    const id = idInput.value.trim();
    if (!name || !id) {
      registerError.hidden = false;
      return;
    }
    registerError.hidden = true;
    state.voterName = name;
    state.voterId = id;
    goToStep(2);
  });

  // ---- Step 2: Face verification ----
  const cameraBox = document.querySelector(".camera-box");
  const cameraFeed = document.getElementById("camera-feed");
  const cameraPlaceholder = document.getElementById("camera-placeholder");
  const btnCamera = document.getElementById("btn-camera");
  const btnVerifyFace = document.getElementById("btn-verify-face");
  const faceStatus = document.getElementById("face-status");

  btnCamera.addEventListener("click", async () => {
    if (state.stream) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      state.stream = stream;
      cameraFeed.srcObject = stream;
      cameraBox.classList.add("is-live");
      btnCamera.textContent = "Camera on";
      btnCamera.disabled = true;
      btnVerifyFace.disabled = false;
      faceStatus.textContent = "Hold still — click verify when centered in the frame.";
    } catch (err) {
      cameraPlaceholder.textContent = "Camera unavailable. You can still simulate verification below.";
      btnVerifyFace.disabled = false;
      faceStatus.textContent = "No camera access — verification will be simulated for this demo.";
    }
  });

  btnVerifyFace.addEventListener("click", () => {
    state.faceVerified = true;
    faceStatus.textContent = "Face matched against enrollment record.";
    stopCamera();
    generateOtp();
    goToStep(3);
  });

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
  }

  // ---- Step 3: OTP ----
  const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
  const demoOtpCode = document.getElementById("demo-otp-code");
  const otpTimerEl = document.getElementById("otp-timer");
  const otpSentTo = document.getElementById("otp-sent-to");
  const otpError = document.getElementById("otp-error");
  let otpTimerHandle = null;

  otpBoxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
      if (box.value && otpBoxes[i + 1]) otpBoxes[i + 1].focus();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && otpBoxes[i - 1]) otpBoxes[i - 1].focus();
    });
  });

  function generateOtp() {
    state.otpCode = String(Math.floor(100000 + Math.random() * 900000));
    demoOtpCode.textContent = state.otpCode;
    otpSentTo.textContent = `A 6-digit code was sent to the number registered to ${state.voterName || "this voter"}.`;
    otpBoxes.forEach((b) => (b.value = ""));
    let seconds = 60;
    otpTimerEl.textContent = seconds;
    if (otpTimerHandle) clearInterval(otpTimerHandle);
    otpTimerHandle = setInterval(() => {
      seconds -= 1;
      otpTimerEl.textContent = Math.max(seconds, 0);
      if (seconds <= 0) {
        clearInterval(otpTimerHandle);
        generateOtp();
      }
    }, 1000);
  }

  document.getElementById("btn-verify-otp").addEventListener("click", () => {
    const entered = otpBoxes.map((b) => b.value).join("");
    if (entered.length === 6 && entered === state.otpCode) {
      otpError.hidden = true;
      clearInterval(otpTimerHandle);
      buildBallot();
      goToStep(4);
    } else {
      otpError.hidden = false;
    }
  });

  // ---- Step 4: Ballot ----
  const ballotList = document.getElementById("ballot-list");
  const btnCast = document.getElementById("btn-cast");

  function buildBallot() {
    ballotList.innerHTML = "";
    CANDIDATES.forEach((c) => {
      const label = document.createElement("label");
      label.className = "ballot-option";
      label.innerHTML = `
        <input type="radio" name="candidate" value="${c.id}">
        <span class="ballot-symbol" style="background:${c.color}">${c.name.charAt(0)}</span>
        <span>
          <span class="ballot-name">${c.name}</span>
          <span class="ballot-party">${c.party}</span>
        </span>
      `;
      label.addEventListener("click", () => {
        document.querySelectorAll(".ballot-option").forEach((el) => el.classList.remove("is-selected"));
        label.classList.add("is-selected");
        state.selectedCandidate = c.id;
        btnCast.disabled = false;
      });
      ballotList.appendChild(label);
    });
  }

  btnCast.addEventListener("click", () => {
    const candidate = CANDIDATES.find((c) => c.id === state.selectedCandidate);
    if (!candidate) return;
    candidate.votes += 1;
    showReceipt();
    goToStep(5);
  });

  // ---- Step 5: Confirmation & results ----
  const receiptName = document.getElementById("receipt-name");
  const receiptTime = document.getElementById("receipt-time");
  const resultsList = document.getElementById("results-list");

  function showReceipt() {
    receiptName.textContent = state.voterName || "—";
    receiptTime.textContent = new Date().toLocaleString();
    renderResults();
  }

  function renderResults() {
    const total = CANDIDATES.reduce((sum, c) => sum + c.votes, 0) || 1;
    resultsList.innerHTML = "";
    CANDIDATES.slice()
      .sort((a, b) => b.votes - a.votes)
      .forEach((c) => {
        const pct = Math.round((c.votes / total) * 100);
        const row = document.createElement("div");
        row.className = "result-row";
        row.innerHTML = `
          <span>${c.name}</span>
          <span class="result-bar-track"><span class="result-bar-fill" style="width:${pct}%; background:${c.color}"></span></span>
          <span>${pct}%</span>
        `;
        resultsList.appendChild(row);
      });
  }

  document.getElementById("btn-restart").addEventListener("click", () => {
    state.voterName = "";
    state.voterId = "";
    state.faceVerified = false;
    state.selectedCandidate = null;
    nameInput.value = "";
    idInput.value = "";
    btnCamera.disabled = false;
    btnCamera.textContent = "Turn on camera";
    btnVerifyFace.disabled = true;
    cameraBox.classList.remove("is-live");
    cameraPlaceholder.textContent = "Camera preview appears here";
    faceStatus.textContent = "Camera access is optional — you can simulate a match without it.";
    goToStep(1);
  });

  goToStep(1);
})();