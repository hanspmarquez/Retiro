const SCHEDULE_URL = "https://scheduler.zoom.us/cristinartz/ppr";

if (typeof document !== "undefined") {
  document.documentElement.classList.add("js");
}

const notes = [
  {
    number: "01",
    title: "Aprender a pensar en décadas.",
    text:
      "Este plan no está diseñado para resolverte el mes; está diseñado para que tu yo de hoy le compre paz a tu yo del futuro. La clave no es adivinar el mercado, es volver sostenible el hábito de invertir.",
  },
  {
    number: "02",
    title: "Bienestar financiero con alguien que te aterriza el camino.",
    text:
      "No necesitas memorizar leyes, porcentajes ni portafolios. Necesitas entender qué estás haciendo, por qué lo haces y cuándo conviene ajustar. Ahí es donde el acompañamiento sí importa.",
  },
];

const taxBrackets = [
  [0.01, 0, 0.0192],
  [8952.5, 171.88, 0.064],
  [75984.56, 4461.94, 0.1088],
  [133536.08, 10723.55, 0.16],
  [155229.81, 14194.54, 0.1792],
  [185852.58, 19682.13, 0.2136],
  [374837.89, 60049.4, 0.2352],
  [590796, 110842.74, 0.3],
  [1127926.85, 271981.99, 0.32],
  [1503902.47, 392294.17, 0.34],
  [4511707.38, 1417476.65, 0.35],
];

const MIN_CONTRIBUTION = 2000;
const MONTHLY_FEE = 0.001;
const AFORE_REFERENCE_RATE = 4;
const AFORE_ANNUAL_COMMISSION = 0.00539;
const DEDUCTION_LIMIT_BY_INCOME = 0.1;
const UMA_DEDUCTION_LIMIT = 5 * 41273.52;
const MONEY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href*="scheduler.zoom.us"]').forEach((link) => {
    link.href = SCHEDULE_URL;
  });

  setupReveal();
  setupCallExperience();
  setupCounters();
  setupTilt();
  renderNotes();
  setupCalculator();
});

function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
}

function setupCallExperience() {
  const screen = document.querySelector(".call-screen");
  const audio = document.querySelector(".call-audio");
  const answerButton = document.querySelector(".answer-button");
  const timer = document.querySelector(".timer");
  const progress = document.querySelector(".progress-value");
  const waveform = document.querySelector(".waveform");
  const answerOptions = document.querySelectorAll(".answers button");
  if (!screen || !audio || !answerButton || !timer || !progress || !waveform) return;

  const audioSkipSeconds = 2;
  const audioPlaybackRate = 1.2;
  const ringLength = 2 * Math.PI * 74;
  let timerFrame = null;
  let vibrationLoop = null;
  let questionTimeout = null;

  progress.style.strokeDasharray = ringLength;
  progress.style.strokeDashoffset = ringLength;

  if (!waveform.children.length) {
    for (let index = 0; index < 20; index += 1) {
      const bar = document.createElement("span");
      bar.style.animationDelay = `${(index % 6) * 0.07}s`;
      waveform.appendChild(bar);
    }
  }

  const formatCallTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const remainder = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  const vibrateIncoming = () => {
    if (!("vibrate" in navigator)) return;
    navigator.vibrate([420, 120, 420]);
    vibrationLoop = window.setInterval(() => {
      navigator.vibrate([420, 120, 420]);
    }, 1700);
  };

  const stopVibration = () => {
    if (vibrationLoop) window.clearInterval(vibrationLoop);
    vibrationLoop = null;
    if ("vibrate" in navigator) navigator.vibrate(0);
  };

  const updateCallProgress = () => {
    const sourceDuration =
      Number.isFinite(audio.duration) && audio.duration > audioSkipSeconds ? audio.duration - audioSkipSeconds : 53;
    const sourceElapsed = Math.max(0, audio.currentTime - audioSkipSeconds);
    const ratio = Math.min(sourceElapsed / sourceDuration, 1);
    timer.textContent = formatCallTime(sourceElapsed / audioPlaybackRate);
    progress.style.strokeDashoffset = ringLength * (1 - ratio);

    if (screen.dataset.state === "active") {
      timerFrame = window.requestAnimationFrame(updateCallProgress);
    }
  };

  const showQuestion = () => {
    screen.dataset.state = "question";
  };

  const finishCall = () => {
    if (timerFrame) window.cancelAnimationFrame(timerFrame);
    timerFrame = null;
    stopVibration();
    progress.style.strokeDashoffset = 0;
    screen.dataset.state = "ended";
    questionTimeout = window.setTimeout(showQuestion, 1100);
  };

  const answerCall = async () => {
    if (screen.dataset.state !== "incoming") return;
    stopVibration();
    screen.dataset.state = "active";
    audio.playbackRate = audioPlaybackRate;

    try {
      audio.currentTime = audioSkipSeconds;
      await audio.play();
    } catch (error) {
      finishCall();
      return;
    }

    updateCallProgress();
  };

  answerButton.addEventListener("click", answerCall);
  audio.addEventListener("ended", finishCall);
  audio.addEventListener("loadedmetadata", () => {
    timer.textContent = "00:00";
  });

  answerOptions.forEach((button) => {
    button.addEventListener("click", () => {
      answerOptions.forEach((option) => option.classList.remove("is-selected"));
      button.classList.add("is-selected");
      localStorage.setItem("retiro_calculo_respuesta", button.dataset.answer || "");
      window.setTimeout(() => {
        document.querySelector("#top")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }, 650);
    });
  });

  window.addEventListener("beforeunload", () => {
    stopVibration();
    if (timerFrame) window.cancelAnimationFrame(timerFrame);
    if (questionTimeout) window.clearTimeout(questionTimeout);
  });

  vibrateIncoming();
}

function renderNotes() {
  const grid = document.querySelector("#note-grid");
  if (!grid) return;

  grid.innerHTML = notes
    .map(
      (note) => `
        <article class="note-card">
          <span>${note.number}</span>
          <h3>${note.title}</h3>
          <p>${note.text}</p>
        </article>
      `
    )
    .join("");
}

function setupCalculator() {
  const form = document.querySelector("#calculator-form");
  const ageInput = document.querySelector("#age-input");
  const contributionInput = document.querySelector("#contribution-input");
  const salaryInput = document.querySelector("#salary-input");
  const showSatButton = document.querySelector("#show-sat-button");
  const satPanel = document.querySelector("#sat-panel");

  if (!form || !ageInput || !contributionInput) return;

  form.addEventListener("submit", (event) => event.preventDefault());
  [ageInput, contributionInput].forEach((input) => {
    input.addEventListener("input", () => {
      renderRetirementResult();
      renderSatResult();
    });
  });

  salaryInput?.addEventListener("input", renderSatResult);

  showSatButton?.addEventListener("click", () => {
    if (!satPanel) return;
    satPanel.hidden = false;
    showSatButton.hidden = true;
    renderSatResult();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderRetirementResult, 160);
  });

  renderRetirementResult();
  setupScenarioTabs(ageInput, contributionInput);
}

function setupScenarioTabs(ageInput, contributionInput) {
  const buttons = document.querySelectorAll(".scenario-tabs button");
  if (!buttons.length || !ageInput || !contributionInput) return;

  const syncActiveButton = () => {
    buttons.forEach((button) => {
      const isActive =
        Number(button.dataset.age) === Number(ageInput.value) &&
        Number(button.dataset.contribution) === Number(contributionInput.value);
      button.classList.toggle("is-active", isActive);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      ageInput.value = button.dataset.age || ageInput.value;
      contributionInput.value = button.dataset.contribution || contributionInput.value;
      buttons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderRetirementResult();
      renderSatResult();
    });
  });

  [ageInput, contributionInput].forEach((input) => input.addEventListener("input", syncActiveButton));
  syncActiveButton();
}

function setupCounters() {
  const counters = document.querySelectorAll("[data-count-to]");
  if (!counters.length) return;

  const animate = (counter) => {
    const target = Number(counter.dataset.countTo);
    if (!Number.isFinite(target) || counter.dataset.counted === "true") return;
    counter.dataset.counted = "true";
    const duration = 900;
    const start = performance.now();

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      counter.textContent = Math.round(target * eased).toLocaleString("es-MX");
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function setupTilt() {
  const cards = document.querySelectorAll("[data-tilt]");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!cards.length || !canHover) return;

  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      card.style.setProperty("--tilt-x", `${(-y * 3).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 3).toFixed(2)}deg`);
      card.style.setProperty("--glow-x", `${((x + 1) / 2) * 100}%`);
      card.style.setProperty("--glow-y", `${((y + 1) / 2) * 100}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
      card.style.removeProperty("--glow-x");
      card.style.removeProperty("--glow-y");
    });
  });
}

function renderRetirementResult() {
  const ageInput = document.querySelector("#age-input");
  const contributionInput = document.querySelector("#contribution-input");
  const result = document.querySelector("#retirement-result");
  const ageHelp = document.querySelector("#age-help");
  const contributionHelp = document.querySelector("#contribution-help");
  if (!ageInput || !contributionInput || !result) return;

  const age = Number(ageInput.value);
  const contribution = Number(contributionInput.value);
  const validAge = Number.isFinite(age) && age >= 18 && age <= 60;
  const validContribution = Number.isFinite(contribution) && contribution >= MIN_CONTRIBUTION;

  ageInput.classList.toggle("invalid", !validAge);
  contributionInput.classList.toggle("invalid", !validContribution);
  setHelp(
    ageHelp,
    validAge ? (age > 40 ? "Entre más tarde empiezas, más valiosa se vuelve la constancia." : "") : "Usa una edad entre 18 y 60 años.",
    validAge ? "warn" : "error"
  );
  setHelp(contributionHelp, validContribution ? "" : "La aportación mínima de referencia es $2,000 mensuales.", "error");

  if (!validAge || !validContribution) {
    result.innerHTML = `
      <div class="empty-result">
        <div>
          <strong>Completa los datos para ver tu escenario.</strong>
          <p>La calculadora necesita edad y aportación mensual válidas.</p>
        </div>
      </div>
    `;
    return;
  }

  const projection = projectRetirement(age, contribution, 12);
  const aforeProjection = projectAforeReference(age, contribution);
  const final = projection[projection.length - 1];
  const aforeFinal = aforeProjection[aforeProjection.length - 1];
  const totalContributed = final.contributed;
  const growth = Math.max(0, final.capital - totalContributed);
  const years = Math.max(0, 65 - age);

  result.innerHTML = `
    <article class="statement-card">
      <header class="statement-header">
        <div>
          <span class="statement-kicker">Estado de cuenta futuro</span>
          <h3>Tu escenario de retiro</h3>
        </div>
        <span class="statement-badge">A los 65</span>
      </header>

      <div class="statement-main">
        <span>Capital estimado</span>
        <strong>${formatMdp(final.capital)}</strong>
        <p>
          En ${years} años, tu aportación mensual podría convertirse en este patrimonio estimado.
          <span>Ref. AFORE con supuestos CONSAR: ${formatMdp(aforeFinal.capital)}.</span>
        </p>
      </div>

      <div class="statement-ledger" aria-label="Resumen del cálculo">
        <div>
          <span>Aportado por ti</span>
          <strong>${formatMoney(totalContributed)}</strong>
        </div>
        <div>
          <span>Crecimiento estimado</span>
          <strong>${formatMoney(growth)}</strong>
        </div>
        <div>
          <span>Ref. AFORE</span>
          <strong>${formatMdp(aforeFinal.capital)}</strong>
        </div>
      </div>

      <div class="statement-chart">
        ${renderChart(projection, aforeProjection)}
        <div class="chart-legend" aria-hidden="true">
          <span><i class="legend-plan"></i>Plan estimado</span>
          <span><i class="legend-afore"></i>Referencia AFORE</span>
        </div>
      </div>
    </article>
  `;
}

function renderSatResult() {
  const contributionInput = document.querySelector("#contribution-input");
  const salaryInput = document.querySelector("#salary-input");
  const satResult = document.querySelector("#sat-result");
  const satPanel = document.querySelector("#sat-panel");
  if (!satResult || !salaryInput || !contributionInput || satPanel?.hidden) return;

  const contribution = Math.max(0, Number(contributionInput.value));
  const annualSaving = contribution * 12;
  const annualIncome = Math.max(0, Number(salaryInput.value) * 12);

  if (contribution < MIN_CONTRIBUTION || !annualIncome) {
    satResult.classList.remove("warning");
    satResult.innerHTML = `
      <div class="sat-smart-top">
        <span>Estimación fiscal</span>
        <span class="sat-stamp">Pendiente</span>
      </div>
      <strong>${formatMoney(0)}</strong>
      <p>Completa una aportación válida y tu ingreso mensual para estimar la devolución.</p>
    `;
    return;
  }

  const refund = calculateRefund(annualIncome, annualSaving);
  satResult.classList.remove("warning");
  satResult.innerHTML = `
    <div class="sat-smart-top">
      <span>Estimación fiscal</span>
      <span class="sat-stamp">Art. 151</span>
    </div>
    <p>Podrías recuperar aproximadamente</p>
    <strong>${formatMoney(refund.refund)}</strong>
    <ul class="sat-breakdown">
      <li><span>Aportación anual usada</span><strong>${formatMoney(annualSaving)}</strong></li>
      <li><span>Tope deducible aplicado</span><strong>${formatMoney(refund.baseDeductible)}</strong></li>
    </ul>
  `;
}

function projectRetirement(age, monthlyContribution, annualRate) {
  const totalMonths = Math.max(0, (65 - age) * 12);
  const monthlyRate = (1 + annualRate / 100) ** (1 / 12) - 1;
  let capital = 0;
  let contributed = 0;
  const rows = [{ age, capital: 0, contributed: 0 }];

  for (let month = 1; month <= totalMonths; month += 1) {
    const contribution = month <= 300 ? monthlyContribution : 0;
    const yieldAmount = (capital + contribution) * monthlyRate;
    const fee = (capital + contribution + yieldAmount) * MONTHLY_FEE;
    capital = capital + contribution + yieldAmount - fee;
    contributed += contribution;

    if (month % 12 === 0) {
      rows.push({
        age: age + month / 12,
        capital: Math.round(capital),
        contributed,
      });
    }
  }

  return rows;
}

function projectAforeReference(age, monthlyContribution) {
  const totalMonths = Math.max(0, (65 - age) * 12);
  const monthlyRate = (1 + AFORE_REFERENCE_RATE / 100) ** (1 / 12) - 1;
  const monthlyCommission = AFORE_ANNUAL_COMMISSION / 12;
  let capital = 0;
  let contributed = 0;
  const rows = [{ age, capital: 0, contributed: 0 }];

  for (let month = 1; month <= totalMonths; month += 1) {
    const yieldAmount = (capital + monthlyContribution) * monthlyRate;
    const commission = (capital + monthlyContribution + yieldAmount) * monthlyCommission;
    capital = capital + monthlyContribution + yieldAmount - commission;
    contributed += monthlyContribution;

    if (month % 12 === 0) {
      rows.push({
        age: age + month / 12,
        capital: Math.round(capital),
        contributed,
      });
    }
  }

  return rows;
}

function renderChart(data, aforeData = []) {
  const isCompact = window.matchMedia("(max-width: 640px)").matches;
  const width = isCompact ? 360 : 760;
  const height = isCompact ? 330 : 330;
  const margin = isCompact
    ? { top: 18, right: 16, bottom: 34, left: 48 }
    : { top: 18, right: 26, bottom: 38, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = [...data, ...aforeData].map((row) => row.capital);
  const maxValue = Math.max(...values, 1) * (isCompact ? 1.03 : 1.06);
  const x = (index) => margin.left + (index / Math.max(1, data.length - 1)) * plotWidth;
  const y = (value) => margin.top + plotHeight - (value / maxValue) * plotHeight;
  const linePoints = data.map((row, index) => `${x(index)},${y(row.capital)}`).join(" ");
  const aforeLinePoints = aforeData.map((row, index) => `${x(index)},${y(row.capital)}`).join(" ");
  const areaPoints = `${margin.left},${margin.top + plotHeight} ${linePoints} ${margin.left + plotWidth},${margin.top + plotHeight}`;
  const gridRows = isCompact ? 3 : 4;
  const horizontalGrid = Array.from({ length: gridRows }, (_, index) => {
    const value = (maxValue / (gridRows - 1)) * index;
    const yy = y(value);
    return `
      <line class="chart-grid" x1="${margin.left}" y1="${yy}" x2="${margin.left + plotWidth}" y2="${yy}" />
      <text class="chart-label" x="${margin.left - 12}" y="${yy + 4}" text-anchor="end">${formatMdp(value)}</text>
    `;
  }).join("");
  const ageTicks = getAgeTicks(data, isCompact);
  const verticalGrid = ageTicks
    .map((tick) => {
      const index = data.findIndex((row) => row.age >= tick);
      const safeIndex = index === -1 ? data.length - 1 : index;
      return `
        <line class="chart-grid" x1="${x(safeIndex)}" y1="${margin.top}" x2="${x(safeIndex)}" y2="${margin.top + plotHeight}" />
        <text class="chart-label" x="${x(safeIndex)}" y="${height - 10}" text-anchor="middle">${Math.round(data[safeIndex].age)}</text>
      `;
    })
    .join("");
  const finalIndex = data.length - 1;
  const finalPoint = data[finalIndex];

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Proyección estimada de retiro">
      ${horizontalGrid}
      ${verticalGrid}
      <polygon class="chart-area" points="${areaPoints}" />
      <polyline class="chart-line-afore" points="${aforeLinePoints}" />
      <polyline class="chart-line-main" points="${linePoints}" />
      <circle class="chart-endpoint" cx="${x(finalIndex)}" cy="${y(finalPoint.capital)}" r="${isCompact ? 5 : 6}" />
    </svg>
  `;
}

function getAgeTicks(data, isCompact = false) {
  const startAge = Math.round(data[0].age);
  if (isCompact) {
    const middleAge = Math.round((startAge + 65) / 2);
    return [...new Set([startAge, middleAge, 65])];
  }

  const ticks = [startAge];
  const firstDecade = Math.ceil(startAge / 10) * 10;

  for (let tick = firstDecade; tick < 65; tick += 10) {
    if (tick > startAge) ticks.push(tick);
  }

  if (!ticks.includes(65)) ticks.push(65);
  return [...new Set(ticks)];
}

function calculateTax(annualIncome) {
  if (annualIncome <= 0) return 0;
  let bracket = taxBrackets[0];

  for (let index = taxBrackets.length - 1; index >= 0; index -= 1) {
    if (annualIncome >= taxBrackets[index][0]) {
      bracket = taxBrackets[index];
      break;
    }
  }

  const [floor, fixedFee, rate] = bracket;
  return fixedFee + (annualIncome - floor) * rate;
}

function calculateRefund(annualIncome, annualSaving) {
  const baseDeductible = Math.max(0, Math.min(annualSaving, annualIncome * DEDUCTION_LIMIT_BY_INCOME, UMA_DEDUCTION_LIMIT));
  const currentTax = calculateTax(annualIncome);
  const newTax = calculateTax(annualIncome - baseDeductible);

  return {
    baseDeductible,
    refund: Math.max(0, currentTax - newTax),
  };
}

function setHelp(element, text, tone) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("error", tone === "error" && Boolean(text));
  element.classList.toggle("warn", tone === "warn" && Boolean(text));
}

function formatMoney(value) {
  return MONEY.format(Math.round(value));
}

function formatMdp(value) {
  return `${(value / 1000000).toFixed(1)} MDP`;
}
