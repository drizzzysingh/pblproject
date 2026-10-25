/* SLCM Compass — client-side prototype. No server, framework, or external library. */
(() => {
  "use strict";
  const STORAGE_KEY = "slcm-compass-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
  const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : "—";
  const safeText = (value) => String(value ?? "");

  const sampleNotice = `The registration portal will close on 02/11/2026 at 5:00 PM. Students must complete course registration before the deadline.
Fee payment and outstanding dues must be cleared by 9 November 2026.
Mid-term examinations begin on 12/11/2026. Practical and viva schedules will be shared separately.
Students below the minimum attendance must submit condonation requests by 16 November 2026.
The university will remain closed for the declared holiday on 20/11/2026.
Semester results are expected on 12 December 2026.`;

  const defaultState = () => ({
    threshold: 75,
    subs: [
      { n: "Natural Language Processing", a: 31, t: 38 },
      { n: "Business Process Mining", a: 27, t: 36 },
      { n: "Deep Learning", a: 24, t: 34 },
      { n: "Cloud Computing", a: 33, t: 35 },
      { n: "Open Elective", a: 16, t: 24 }
    ],
    courses: [
      { n: "Natural Language Processing", c: 4, g: 8 },
      { n: "Business Process Mining", c: 3, g: 9 },
      { n: "Deep Learning", c: 4, g: 8 },
      { n: "Cloud Computing", c: 3, g: 9 },
      { n: "Open Elective", c: 2, g: 8 }
    ],
    cg0: 7.8, cr0: 120, tg: 8,
    risk: { attendance: 72, trend: -3, marks: 58, assignments: 75 },
    notice: ""
  });

  let state = defaultState();
  let toastTimer;
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        state = { ...defaultState(), ...parsed };
        if (!Array.isArray(state.subs)) state.subs = defaultState().subs;
        if (!Array.isArray(state.courses)) state.courses = defaultState().courses;
        state.risk = { ...defaultState().risk, ...(state.risk || {}) };
      }
    } catch (_) { /* Storage may be unavailable; the app still works in memory. */ }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function attendancePercent(a, t) { return t > 0 ? 100 * a / t : null; }
  function skipBudget(a, t, threshold) {
    if (t <= 0 || a / t < threshold / 100) return 0;
    return Math.max(0, Math.floor(a / (threshold / 100) - t + 1e-9));
  }
  function recoveryRun(a, t, threshold) {
    if (t <= 0 || a / t >= threshold / 100) return 0;
    return Math.max(0, Math.ceil(((threshold / 100) * t - a) / (1 - threshold / 100) - 1e-9));
  }
  function attendanceStatus(sub, threshold) {
    if (sub.t <= 0) return { label: "No data", cls: "status-limit", advice: "Enter classes held" };
    const p = sub.a / sub.t * 100;
    if (p < threshold) return { label: "Below limit", cls: "status-below", advice: `Attend the next ${recoveryRun(sub.a, sub.t, threshold)} in a row` };
    if (Math.abs(p - threshold) < 1e-8 || skipBudget(sub.a, sub.t, threshold) === 0)
      return { label: "At the limit", cls: "status-limit", advice: "Avoid missing the next class" };
    return { label: "Safe", cls: "status-safe", advice: `Can miss ${skipBudget(sub.a, sub.t, threshold)} more class${skipBudget(sub.a, sub.t, threshold) === 1 ? "" : "es"}` };
  }
  function totalAttendance() {
    const a = state.subs.reduce((sum, s) => sum + s.a, 0);
    const t = state.subs.reduce((sum, s) => sum + s.t, 0);
    return { a, t, p: t ? a / t * 100 : 0 };
  }
  function renderAttendance() {
    const threshold = clamp(state.threshold, 1, 99);
    $("#threshold").value = threshold;
    const total = totalAttendance();
    $("#overall-attendance").textContent = `${fmt(total.p)}%`;
    $("#overview-attendance").textContent = `${fmt(total.p)}%`;
    $("#below-count").textContent = state.subs.filter(s => s.t > 0 && s.a / s.t * 100 < threshold).length;
    $("#limit-count").textContent = state.subs.filter(s => s.t > 0 && attendanceStatus(s, threshold).label === "At the limit").length;
    const tbody = $("#attendance-rows"); tbody.replaceChildren();
    state.subs.forEach((sub, i) => {
      const tr = document.createElement("tr");
      const p = attendancePercent(sub.a, sub.t);
      const status = attendanceStatus(sub, threshold);
      tr.innerHTML = `
        <td class="subject-name"><input class="table-input" aria-label="Subject name" data-sub="${i}" data-field="n" value="${escapeAttr(sub.n)}"></td>
        <td><input class="table-input" aria-label="Classes attended" type="number" min="0" max="${Math.max(0, sub.t)}" data-sub="${i}" data-field="a" value="${sub.a}"></td>
        <td><input class="table-input" aria-label="Classes held" type="number" min="0" data-sub="${i}" data-field="t" value="${sub.t}"></td>
        <td class="attendance-cell"><strong>${p === null ? "—" : `${fmt(p)}%`}</strong><div class="table-progress"><i style="width:${clamp(p || 0,0,100)}%;background:${p !== null && p < threshold ? "#d84c62" : "#745de8"}"></i></div></td>
        <td><span class="status-pill ${status.cls}">${status.label}</span><span class="advice">${status.advice}</span></td>
        <td><button class="icon-button remove-subject" data-remove="${i}" aria-label="Remove ${escapeAttr(sub.n)}" title="Remove subject">×</button></td>`;
      tbody.appendChild(tr);
    });
    const select = $("#planner-subject"), previous = select.value;
    select.replaceChildren();
    state.subs.forEach((s, i) => { const option = document.createElement("option"); option.value = String(i); option.textContent = s.n || `Subject ${i+1}`; select.appendChild(option); });
    if (state.subs.length) select.value = state.subs.some((_, i) => String(i) === previous) ? previous : "0";
    renderProjection();
    saveState();
  }
  function renderProjection() {
    const idx = Number($("#planner-subject").value || 0), sub = state.subs[idx];
    const L = clamp($("#future-classes").value, 0, 10000);
    const m = clamp($("#planned-misses").value, 0, L);
    $("#planned-misses").max = L;
    if (!sub) { $("#projection-result").textContent = "Add a subject to use the planner."; return; }
    const p = (sub.a + L - m) / Math.max(1, sub.t + L) * 100;
    const maxMisses = Math.floor(sub.a + L - state.threshold / 100 * (sub.t + L) + 1e-9);
    const result = $("#projection-result");
    if (p + 1e-8 >= state.threshold) {
      result.innerHTML = `<strong>${fmt(p)}%</strong> projected attendance <span class="result-sub">Your plan meets the ${state.threshold}% minimum. You can miss at most ${Math.max(0, Math.min(L, maxMisses))} of the ${L} remaining classes.</span>`;
    } else {
      const best = (sub.a + L) / Math.max(1, sub.t + L) * 100;
      result.innerHTML = `<strong>${fmt(p)}%</strong> projected attendance <span class="result-sub">This plan is below the ${state.threshold}% minimum. ${best + 1e-8 < state.threshold ? `Even attending all remaining classes reaches only ${fmt(best)}%.` : `Reduce planned misses; at most ${Math.max(0, Math.min(L, maxMisses))} can be missed.`}</span>`;
    }
  }
  function escapeAttr(value) { return safeText(value).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

  function renderGrades() {
    const tbody = $("#course-rows"); tbody.replaceChildren();
    state.courses.forEach((course, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input class="table-input" style="width:100%;max-width:270px" aria-label="Course name" data-course="${i}" data-field="n" value="${escapeAttr(course.n)}"></td>
        <td><input class="table-input" aria-label="Course credits" type="number" min="0" data-course="${i}" data-field="c" value="${course.c}"></td>
        <td><input class="table-input" aria-label="Grade point" type="number" min="0" max="10" step=".1" data-course="${i}" data-field="g" value="${course.g}"></td>
        <td><button class="icon-button remove-course" data-remove-course="${i}" aria-label="Remove course" title="Remove course">×</button></td>`;
      tbody.appendChild(tr);
    });
    const credits = state.courses.reduce((sum, c) => sum + c.c, 0);
    const weighted = state.courses.reduce((sum, c) => sum + c.c * c.g, 0);
    const sgpa = credits ? weighted / credits : 0;
    const allCredits = Number(state.cr0) + credits;
    const newCgpa = allCredits ? (Number(state.cg0) * Number(state.cr0) + weighted) / allCredits : 0;
    $("#sgpa-result").textContent = credits ? fmt(sgpa, 2) : "—";
    $("#cgpa-result").textContent = credits ? fmt(newCgpa, 2) : "—";
    $("#semester-credits").textContent = credits;
    $("#overview-sgpa").textContent = credits ? fmt(sgpa, 2) : "—";
    $("#previous-cgpa").value = state.cg0; $("#previous-credits").value = state.cr0; $("#target-cgpa").value = state.tg;
    const target = Number(state.tg), req = credits ? (target * (Number(state.cr0) + credits) - Number(state.cg0) * Number(state.cr0)) / credits : NaN;
    let message;
    if (!credits) message = "Add at least one course with credits above zero.";
    else if (req > 10) message = `Target requires an SGPA of ${fmt(req,2)}, above the maximum grade point of 10. It is out of reach this semester.`;
    else if (req <= 0) message = "This target is already secured based on the entered values.";
    else message = `You need an SGPA of about ${fmt(req,2)} this semester to reach a CGPA of ${fmt(target,2)}.`;
    $("#target-result").innerHTML = `<strong>${credits ? (req > 10 ? "Target out of reach" : req <= 0 ? "Target already secured" : `${fmt(req,2)} SGPA required`) : "Course data needed"}</strong><span class="result-sub">${message}</span>`;
    saveState();
  }
  function renderRisk() {
    const r = state.risk;
    $("#risk-attendance").value = r.attendance; $("#risk-trend").value = r.trend;
    $("#risk-marks").value = r.marks; $("#risk-assignments").value = r.assignments;
    $("#risk-attendance-out").textContent = `${r.attendance}%`;
    $("#risk-trend-out").textContent = `${r.trend > 0 ? "+" : r.trend < 0 ? "−" : ""}${Math.abs(r.trend)} points`;
    $("#risk-marks-out").textContent = `${r.marks}%`;
    $("#risk-assignments-out").textContent = `${r.assignments}%`;
    const M = state.threshold;
    const terms = [
      { label: "Baseline", value: -1.2 },
      { label: "Attendance gap", value: -1.1 * (r.attendance - M) / 5 },
      { label: "Recent trend", value: -0.3 * r.trend / 2.5 },
      { label: "Internal marks", value: -0.02 * (r.marks - 60) },
      { label: "Assignment completion", value: -0.015 * (r.assignments - 80) }
    ];
    const z = terms.reduce((sum, term) => sum + term.value, 0);
    const p = 1 / (1 + Math.exp(-z)) * 100;
    const level = p < 25 ? "Low estimate" : p < 55 ? "Moderate estimate" : "High estimate";
    $("#risk-percent").innerHTML = `${Math.round(p)}<span>%</span>`;
    $("#risk-level").textContent = level; $("#risk-level").className = `risk-level ${p < 25 ? "low" : p < 55 ? "moderate" : "high"}`;
    $("#risk-track-fill").style.width = `${p}%`;
    $("#risk-track-fill").style.background = p < 25 ? "#169a72" : p < 55 ? "#e7a34e" : "#d84c62";
    const maxAbs = Math.max(1, ...terms.map(t => Math.abs(t.value)));
    $("#risk-contributions").replaceChildren();
    terms.forEach(term => {
      const row = document.createElement("div"); row.className = "contribution";
      row.innerHTML = `<span>${term.label}</span><strong>${term.value > 0 ? "+" : ""}${fmt(term.value,2)}</strong><div class="contribution-track"><i class="${term.value < 0 ? "" : "negative"}" style="width:${Math.abs(term.value)/maxAbs*100}%"></i></div>`;
      $("#risk-contributions").appendChild(row);
    });
    saveState();
  }
  const TOPICS = [
    ["Exam", /\b(exam|examination|internals|mid[- ]?term|end[- ]?sem|viva|practicals?)\b/i],
    ["Fees", /\b(fee|fees|payment|fine|dues)\b/i],
    ["Registration", /\b(register|registration|enrol(?:l)?ment|course selection)\b/i],
    ["Attendance", /\b(attendance|condonation|shortfall)\b/i],
    ["Holiday", /\b(holiday|closed|vacation)\b/i],
    ["Results", /\b(results?|grade card)\b/i]
  ];
  function parseDate(day, month, year) {
    const d = Number(day), y = Number(year), m = monthMap(month);
    if (!m || y < 1900 || y > 2200) return null;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }
  function monthMap(value) {
    if (/^\d+$/.test(String(value))) { const m = Number(value); return m >= 1 && m <= 12 ? m : null; }
    const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const normalized = String(value).toLowerCase().slice(0,3);
    return months.findIndex(m => m.slice(0,3) === normalized) + 1 || null;
  }
  function extractNotices(text) {
    const today = new Date(); today.setHours(0,0,0,0);
    const sentences = text.split(/\n+|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    const results = [];
    const patterns = [
      { re: /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g, parse: m => parseDate(m[1],m[2],m[3]) },
      { re: /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi, parse: m => parseDate(m[1],m[2],m[3]) }
    ];
    sentences.forEach(sentence => {
      let matchDate = null, dateText = "";
      for (const pattern of patterns) {
        pattern.re.lastIndex = 0;
        const match = pattern.re.exec(sentence);
        if (match) { matchDate = pattern.parse(match); dateText = match[0]; if (matchDate) break; }
      }
      if (!matchDate) return;
      const time = sentence.match(/\b(\d{1,2}:\d{2}\s?(?:AM|PM)|\d{1,2}\s?(?:AM|PM))\b/i);
      const topics = TOPICS.filter(([,re]) => re.test(sentence)).map(([topic]) => topic);
      const days = Math.round((matchDate - today) / 86400000);
      results.push({ date: matchDate, dateText, time: time ? time[0].toUpperCase() : "", sentence, topics, days });
    });
    results.sort((a,b) => a.date - b.date);
    return results;
  }
  function renderNotices() {
    const text = $("#notice-text").value;
    state.notice = text; saveState();
    const results = extractNotices(text);
    $("#notice-count").textContent = `${results.length} item${results.length === 1 ? "" : "s"}`;
    $("#notice-summary").textContent = results.length ? `${results.length} recognised date${results.length === 1 ? "" : "s"} sorted by date. Verify against the original notice.` : "No recognised dates yet.";
    const container = $("#notice-results"); container.replaceChildren();
    if (!results.length) { container.className = "deadline-list empty-state"; container.textContent = text.trim() ? "No supported dates found. Try day-first dates such as 02/11/2026 or 9 November 2026." : "Paste a notice and select “Find deadlines” to get started."; return; }
    container.className = "deadline-list";
    results.forEach(item => {
      const el = document.createElement("article"); el.className = "deadline-item";
      const date = item.date;
      const daysText = item.days < 0 ? `${Math.abs(item.days)} day${item.days === -1 ? "" : "s"} ago` : item.days === 0 ? "Today" : `In ${item.days} day${item.days === 1 ? "" : "s"}`;
      const urgency = item.days <= 3 ? "urgent" : item.days <= 10 ? "soon" : "";
      el.innerHTML = `<div class="date-block"><strong>${date.getDate()}</strong><span>${date.toLocaleString("en-IN",{month:"short"})}</span></div><div><h4>${escapeAttr(item.topics.length ? item.topics.join(" · ") : "General deadline")}${item.time ? ` · ${escapeAttr(item.time)}` : ""}</h4><p>${escapeAttr(item.sentence)}</p><div class="topic-tags">${item.topics.map(t => `<span class="topic-tag">${escapeAttr(t)}</span>`).join("") || '<span class="topic-tag">Unclassified</span>'}</div></div><span class="days-left ${urgency}">${daysText}</span>`;
      container.appendChild(el);
    });
  }
  const titles = {
    overview: ["Your semester, made clearer.", "A single place to plan attendance, grades and important dates."],
    attendance: ["Plan attendance before it becomes a problem.", "See each subject’s current position and test a what-if plan."],
    grades: ["Make your grade goals measurable.", "Model a semester result and calculate the SGPA needed for a target."],
    risk: ["Spot patterns—not promises.", "An explainable placeholder model for exploring shortfall risk."],
    notices: ["Turn long notices into a dated list.", "Extract recognised dates and topics from text you paste."]
  };
  function activateTab(tab) {
    if (!titles[tab]) return;
    $$(".view").forEach(view => view.classList.toggle("active", view.id === `view-${tab}`));
    $$(".nav-tab").forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active));
    });
    $("#page-title").textContent = titles[tab][0]; $("#page-subtitle").textContent = titles[tab][1];
    if (tab === "attendance") renderAttendance();
    if (tab === "grades") renderGrades();
    if (tab === "risk") renderRisk();
    if (tab === "notices" && state.notice) $("#notice-text").value = state.notice;
  }
  function bindEvents() {
    $$(".nav-tab").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.tab)));
    $$("[data-go]").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.go)));
    $("#reset-demo").addEventListener("click", () => {
      state = defaultState(); $("#notice-text").value = ""; saveState();
      renderAttendance(); renderGrades(); renderRisk(); $("#notice-results").textContent = "Paste a notice and select “Find deadlines” to get started.";
      $("#notice-count").textContent = "0 items"; $("#notice-summary").textContent = "Your extracted deadlines will appear here.";
      activateTab("overview"); toast("Sample data restored.");
    });
    $("#threshold").addEventListener("change", e => {
      const value = Number(e.target.value);
      if (!Number.isFinite(value) || value < 1 || value > 99) { toast("Minimum must be between 1% and 99%."); e.target.value = state.threshold; return; }
      state.threshold = value; renderAttendance(); renderRisk();
    });
    $("#attendance-rows").addEventListener("change", e => {
      const input = e.target.closest("[data-sub]"); if (!input) return;
      const i = Number(input.dataset.sub), field = input.dataset.field;
      if (!state.subs[i]) return;
      if (field === "n") state.subs[i].n = input.value.slice(0,80);
      else if (field === "t") {
        state.subs[i].t = clamp(input.value,0,100000);
        state.subs[i].a = clamp(state.subs[i].a,0,state.subs[i].t);
      } else if (field === "a") {
        const val = Number(input.value);
        if (val > state.subs[i].t) { toast("Attended classes cannot exceed classes held."); state.subs[i].a = state.subs[i].t; }
        else state.subs[i].a = clamp(val,0,state.subs[i].t);
      }
      renderAttendance();
    });
    $("#attendance-rows").addEventListener("click", e => {
      const btn = e.target.closest("[data-remove]"); if (!btn) return;
      state.subs.splice(Number(btn.dataset.remove),1); renderAttendance(); toast("Subject removed.");
    });
    $("#add-subject").addEventListener("click", () => {
      state.subs.push({ n: `New subject ${state.subs.length + 1}`, a: 0, t: 0 }); renderAttendance(); toast("Subject added.");
    });
    ["planner-subject","future-classes","planned-misses"].forEach(id => $(`#${id}`).addEventListener("input", renderProjection));
    $("#course-rows").addEventListener("change", e => {
      const input = e.target.closest("[data-course]"); if (!input) return;
      const i = Number(input.dataset.course), field = input.dataset.field;
      if (!state.courses[i]) return;
      if (field === "n") state.courses[i].n = input.value.slice(0,80);
      if (field === "c") state.courses[i].c = clamp(input.value,0,1000);
      if (field === "g") state.courses[i].g = clamp(input.value,0,10);
      renderGrades();
    });
    $("#course-rows").addEventListener("click", e => {
      const btn = e.target.closest("[data-remove-course]"); if (!btn) return;
      state.courses.splice(Number(btn.dataset.removeCourse),1); renderGrades(); toast("Course removed.");
    });
    $("#add-course").addEventListener("click", () => {
      state.courses.push({ n: `New course ${state.courses.length + 1}`, c: 3, g: 8 }); renderGrades(); toast("Course added.");
    });
    [["previous-cgpa","cg0",0,10],["previous-credits","cr0",0,100000],["target-cgpa","tg",0,10]].forEach(([id,key,min,max]) => {
      $(`#${id}`).addEventListener("change", e => {
        const val = Number(e.target.value);
        if (!Number.isFinite(val) || val < min || val > max) { toast(`Enter a value between ${min} and ${max}.`); e.target.value = state[key]; return; }
        state[key] = val; renderGrades();
      });
    });
    ["attendance","trend","marks","assignments"].forEach(key => $(`#risk-${key}`).addEventListener("input", e => {
      state.risk[key] = Number(e.target.value); renderRisk();
    }));
    $("#use-overall").addEventListener("click", () => {
      state.risk.attendance = Math.round(totalAttendance().p * 2) / 2; renderRisk(); toast("Risk attendance updated from subject data.");
    });
    $("#load-notice").addEventListener("click", () => { $("#notice-text").value = sampleNotice; state.notice = sampleNotice; renderNotices(); });
    $("#find-deadlines").addEventListener("click", renderNotices);
    $("#notice-text").addEventListener("input", () => { state.notice = $("#notice-text").value; saveState(); });
    document.addEventListener("keydown", e => {
      if (!["ArrowLeft","ArrowRight"].includes(e.key) || !e.target.classList.contains("nav-tab")) return;
      const tabs = $$(".nav-tab"), i = tabs.indexOf(e.target), next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      e.preventDefault(); next.focus(); next.click();
    });
  }
  function init() {
    loadState(); bindEvents();
    $("#notice-text").value = state.notice || sampleNotice;
    if (!state.notice) state.notice = sampleNotice;
    renderAttendance(); renderGrades(); renderRisk(); renderNotices();
    activateTab("overview");
  }
  init();
})();
