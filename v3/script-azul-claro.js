const SCHEDULE_URL = "https://calendly.com/hanspmz-dev/45min";

if (typeof document !== "undefined") {
  document.documentElement.classList.add("js");
}

// ── Notes content ──────────────────────────────────────────────────────────
const notes = [
  {
    number: "01",
    title: "No necesitas sacrificar tu estilo de vida para empezar.",
    text: "Muchos creen que para construir un buen retiro hay que aportar sumas enormes. La realidad es que empezar con un monto cómodo que tú controlas, aprovechando los rendimientos y la devolución de impuestos, genera un patrimonio mucho más grande que intentar recuperar el tiempo después.",
  },
  {
    number: "02",
    title: "No necesitas ser experto en finanzas.",
    text: "Para eso estoy yo. Te acompaño personalmente desde el día uno y revisamos tu estrategia año con año. Tú te enfocas en tu negocio o carrera, tu capital crece con la solidez y el respaldo de Allianz, y yo me aseguro de que siempre esté en el camino correcto.",
  },
];

// ── Tax brackets (ISR 2024) ────────────────────────────────────────────────
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

// ── Constants ──────────────────────────────────────────────────────────────
const MIN_CONTRIBUTION = 2000;
const MONTHLY_FEE = 0.001;
const AFORE_REFERENCE_RATE = 4;
const AFORE_ANNUAL_COMMISSION = 0.00539;
const DEDUCTION_LIMIT_BY_INCOME = 0.1;
const UMA_DEDUCTION_LIMIT = 5 * 41273.52;

// Constantes exactas del simulador de rentas privadas
const INFLATION_RATE = 0.04;
const NET_ANNUAL_RETURN = 0.10526174998506443;
const RENT_FACTOR = 0.008; // 0.8% mensual para renta vitalicia

// Pensión vitalicia: de los 65 a los 80 años = 180 meses
const PENSION_MONTHS = 15 * 12;
// Tasas de renta vitalicia de referencia
const PPR_ANNUITY_RATE = 5;    // identificador para PPR
const AFORE_ANNUITY_RATE = 3;  // 3% anual (referencia CONSAR)

const MONEY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href*="scheduler.zoom.us"]').forEach((link) => {
    link.href = SCHEDULE_URL;
  });

  setupReveal();
  setupCallExperience(); // no-op if call elements are absent (landing page)
  setupCounters();
  setupTilt();
  renderNotes();
  setupCalculator();
});

// ── Reveal on scroll ───────────────────────────────────────────────────────
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

// ── Call experience (no-op in landing) ────────────────────────────────────
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

// ── Notes ──────────────────────────────────────────────────────────────────
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

// ── Calculator ─────────────────────────────────────────────────────────────
function setupCalculator() {
  const form = document.querySelector("#calculator-form");
  const ageInput = document.querySelector("#age-input");
  const contributionInput = document.querySelector("#contribution-input");
  const salaryInput = document.querySelector("#salary-input");
  const showSatButton = document.querySelector("#show-sat-button");
  const satPanel = document.querySelector("#sat-panel");

  if (!form || !ageInput || !contributionInput) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderRetirementResult();
    renderSatResult();
    const resultPanel = document.querySelector("#retirement-result");
    resultPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
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

// ── Counters ───────────────────────────────────────────────────────────────
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

// ── Tilt ───────────────────────────────────────────────────────────────────
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

// ── Pension vitalicia ──────────────────────────────────────────────────────
/**
 * Calcula la pensión mensual aproximada usando una fórmula de anualidad.
 * @param {number} capital - Capital acumulado al retiro
 * @param {number} annualRate - Tasa anual de la renta vitalicia (%)
 * @returns {number} Pensión mensual estimada
 */
function calculateMonthlyPension(capital, annualRate) {
  if (capital <= 0 || annualRate <= 0) return 0;
  if (annualRate === PPR_ANNUITY_RATE) {
    return Math.round(capital * RENT_FACTOR);
  }
  const r = (1 + annualRate / 100) ** (1 / 12) - 1;
  return Math.round((capital * r) / (1 - (1 + r) ** (-PENSION_MONTHS)));
}

// ── Retirement result ──────────────────────────────────────────────────────
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
    validAge ? (age > 40 ? "Entre más tarde empiezas, más vale la constancia." : "") : "Usa una edad entre 18 y 60 años.",
    validAge ? "warn" : "error"
  );
  setHelp(contributionHelp, validContribution ? "" : "La aportación mínima de referencia es $2,000 mensuales.", "error");

  if (!validAge || !validContribution) {
    result.innerHTML = `
      <div class="empty-result">
        <div>
          <strong>Ingresa tu edad y aportación para ver el escenario.</strong>
          <p>Con esos dos datos la calculadora muestra cuánto podrías tener a los 65.</p>
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

  const pprPension = calculateMonthlyPension(final.capital, PPR_ANNUITY_RATE);
  const aforePension = calculateMonthlyPension(aforeFinal.capital, AFORE_ANNUITY_RATE);
  const capitalDiff = Math.max(0, final.capital - aforeFinal.capital);

  result.innerHTML = `
    <article class="statement-card">
      <header class="statement-header">
        <div>
          <span class="statement-kicker">Estado de cuenta futuro</span>
          <h3>Tu escenario a los 65</h3>
        </div>
        <span class="statement-badge">${years} años</span>
      </header>

      <!-- PPR Allianz -->
      <div class="scenario-block scenario-block-ppr">
        <div class="scenario-tag-row">
          <span class="scenario-tag scenario-tag-ppr">PPR Allianz</span>
        </div>
        <div class="scenario-numbers">
          <div class="scenario-col">
            <span class="scenario-label">Capital acumulado estimado (MXN)</span>
            <strong class="scenario-capital-num">${formatMdp(final.capital)}</strong>
          </div>
          <div class="scenario-col">
            <span class="scenario-label">Renta vitalicia garantizada (MXN)</span>
            <strong class="scenario-pension-num">${formatMoney(pprPension)}<small>/mes</small></strong>
            <em class="scenario-note">De por vida (incluso si vives +100 años)</em>
          </div>
        </div>
      </div>

      <!-- AFORE / Ahorro tradicional referencia -->
      <div class="scenario-block scenario-block-afore">
        <div class="scenario-tag-row">
          <span class="scenario-tag scenario-tag-afore">Ahorro por tu cuenta / AFORE</span>
          <p class="scenario-sub">Sin estrategia fiscal ni portafolio indexado</p>
        </div>
        <div class="scenario-numbers">
          <div class="scenario-col">
            <span class="scenario-label">Capital acumulado estimado (MXN)</span>
            <strong class="scenario-capital-num scenario-capital-afore">${formatMdp(aforeFinal.capital)}</strong>
          </div>
          <div class="scenario-col">
            <span class="scenario-label">Renta mensual aprox. (MXN)</span>
            <strong class="scenario-pension-num scenario-pension-afore">${formatMoney(aforePension)}<small>/mes</small></strong>
            <em class="scenario-note">Se agota con el tiempo</em>
          </div>
        </div>
      </div>

      ${capitalDiff > 0 ? `
      <div class="scenario-diff">
        <span>Diferencia estimada en capital</span>
        <strong>+${formatMdp(capitalDiff)} más con el PPR</strong>
      </div>
      ` : ""}

      <div class="statement-ledger" aria-label="Resumen del cálculo">
        <div>
          <span>Lo que aportarías</span>
          <strong>${formatMoney(totalContributed)}</strong>
        </div>
        <div>
          <span>Crecimiento estimado</span>
          <strong>${formatMoney(growth)}</strong>
        </div>
        <div>
          <span>Horizonte</span>
          <strong>${years} años</strong>
        </div>
      </div>

      <div class="statement-chart-wrap">
        <div class="chart-legend" aria-hidden="true">
          <span class="legend-item legend-item-plan"><i class="legend-plan"></i>PPR Allianz</span>
          <span class="legend-item legend-item-afore"><i class="legend-afore"></i>Ahorro por tu cuenta / AFORE</span>
        </div>
        <div class="statement-chart">
          ${renderChart(projection, aforeProjection)}
        </div>
        <p class="chart-footnote">Todas las cantidades están en pesos mexicanos (MXN). MDP significa millones de pesos mexicanos.</p>
      </div>

      <p class="statement-disclaimer">
        Estimación proyectada en pesos mexicanos (MXN), con rendimiento neto compuesto (10.52% anual) e incremento anual de aportación. La renta vitalicia privada garantiza tu pago mensual de por vida —incluso si superas los 100 años de edad. Esta es la estrategia patrimonial diseñada para dueños de negocio, emprendedores y profesionistas que quieren retirarse a los 65 sin tener que trabajar por obligación el resto de su vida.
      </p>
    </article>
  `;
}

// ── SAT result ─────────────────────────────────────────────────────────────
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
      <p>Ingresa tu sueldo mensual bruto para estimar cuánto podría devolverte el SAT.</p>
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

// ── Projection math ────────────────────────────────────────────────────────
function projectRetirement(age, monthlyContribution) {
  const years = Math.max(0, 65 - age);
  const monthlyReturn = Math.pow(1 + NET_ANNUAL_RETURN, 1 / 12) - 1;
  let capital = 0;
  let contributed = 0;
  const rows = [{ age, capital: 0, contributed: 0 }];

  for (let year = 0; year < years; year += 1) {
    const yearContribution = monthlyContribution * Math.pow(1 + INFLATION_RATE, year);

    for (let month = 1; month <= 12; month += 1) {
      capital = (capital + yearContribution) * (1 + monthlyReturn);
      contributed += yearContribution;
    }

    rows.push({
      age: age + year + 1,
      capital: Math.round(capital),
      contributed: Math.round(contributed),
    });
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

// ── Chart ──────────────────────────────────────────────────────────────────
function renderChart(data, aforeData = []) {
  const isCompact = window.matchMedia("(max-width: 640px)").matches;
  const width = isCompact ? 360 : 760;
  const height = isCompact ? 300 : 300;
  const margin = isCompact
    ? { top: 24, right: 22, bottom: 28, left: 58 }
    : { top: 24, right: 34, bottom: 28, left: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = [...data, ...aforeData].map((row) => row.capital);
  const maxValue = Math.max(...values, 1) * (isCompact ? 1.05 : 1.08);
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
      <text class="chart-label" x="${margin.left - 12}" y="${yy + 4}" text-anchor="end" font-weight="700" fill="#0f271f">${formatMdp(value)}</text>
    `;
  }).join("");
  const ageTicks = getAgeTicks(data, isCompact);
  const ageTickData = ageTicks.map((tick) => {
    const index = data.findIndex((row) => row.age >= tick);
    const safeIndex = index === -1 ? data.length - 1 : index;
    return {
      age: Math.round(data[safeIndex].age),
      x: x(safeIndex),
    };
  });
  const verticalGrid = ageTickData
    .map((tick) => `
      <line class="chart-grid" x1="${tick.x}" y1="${margin.top}" x2="${tick.x}" y2="${margin.top + plotHeight}" />
    `)
    .join("");
  const ageAxis = ageTickData
    .map((tick) => `<span style="left: ${(tick.x / width) * 100}%">${tick.age}</span>`)
    .join("");
  const finalIndex = data.length - 1;
  const finalPoint = data[finalIndex];
  const aforeFinalIndex = Math.max(0, aforeData.length - 1);
  const aforeFinalPoint = aforeData[aforeFinalIndex];
  const endpointRadius = isCompact ? 7 : 8;

  return `
    <svg viewBox="0 0 ${width} ${height}" style="overflow: visible;" role="img" aria-label="Proyección estimada de retiro en pesos mexicanos. MDP significa millones de pesos mexicanos.">
      ${horizontalGrid}
      ${verticalGrid}
      <polygon class="chart-area" points="${areaPoints}" />
      <polyline class="chart-line-afore" points="${aforeLinePoints}" />
      <polyline class="chart-line-main" points="${linePoints}" />
      ${aforeData.length ? `<circle class="chart-endpoint-afore" cx="${x(Math.min(aforeFinalIndex, data.length - 1))}" cy="${y(aforeFinalPoint.capital)}" r="${isCompact ? 4 : 5}" />` : ""}
      <circle class="chart-endpoint-halo" cx="${x(finalIndex)}" cy="${y(finalPoint.capital)}" r="${endpointRadius + 8}" />
      <circle class="chart-endpoint" cx="${x(finalIndex)}" cy="${y(finalPoint.capital)}" r="${endpointRadius}" />
    </svg>
    <div class="chart-age-axis" aria-hidden="true">${ageAxis}</div>
  `;
}

function getAgeTicks(data, isCompact = false) {
  const startAge = Math.round(data[0].age);
  if (isCompact) {
    if (65 - startAge <= 14) return [...new Set([startAge, 65])];
    const middleAge = Math.round((startAge + 65) / 2);
    if (65 - middleAge < 8 || middleAge - startAge < 8) return [...new Set([startAge, 65])];
    return [...new Set([startAge, middleAge, 65])];
  }

  const ticks = [startAge];
  const firstDecade = Math.ceil((startAge + 5) / 10) * 10;

  for (let tick = firstDecade; tick < 60; tick += 10) {
    if (tick - startAge >= 6 && 65 - tick >= 7) {
      ticks.push(tick);
    }
  }

  if (!ticks.includes(65)) ticks.push(65);
  return [...new Set(ticks)];
}

// ── Tax math ───────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────
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
  const mdp = value / 1000000;
  const truncated = Math.trunc(mdp * 10) / 10;
  const formatted = truncated.toFixed(1);
  return `${formatted} MDP`;
}
