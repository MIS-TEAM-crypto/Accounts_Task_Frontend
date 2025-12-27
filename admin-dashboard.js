const API = "https://accounts-task-backend-1.onrender.com";

(() => {
  const role = sessionStorage.getItem("role");
  if (role !== "admin") {
    sessionStorage.clear();
    location.href = "admin-login.html";
    return;
  }

  const filterType = document.getElementById("filterType");
  const filterDate = document.getElementById("filterDate");
  const monthPicker = document.getElementById("monthPicker");
  const yearPicker = document.getElementById("yearPicker");
  const filterUser = document.getElementById("filterUser");
  const filterManager = document.getElementById("filterManager");

  const scoreCards = document.getElementById("scoreCards");
  const monthlyTables = document.getElementById("monthlyTables");
  const yearlyTables = document.getElementById("yearlyTables");

  filterDate.value = new Date().toISOString().slice(0, 10);
  monthPicker.value = new Date().toISOString().slice(0, 7);
  yearPicker.value = new Date().getFullYear();

  document.getElementById("refreshBtn").onclick = loadScores;
  document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.clear();
    location.href = "index.html";
  };

  [filterType, filterDate, monthPicker, yearPicker, filterUser, filterManager]
    .forEach(el => el.addEventListener("change", loadScores));

  /* ================= MAIN ================= */
  async function loadScores() {
    scoreCards.innerHTML = "";
    monthlyTables.innerHTML = "";
    yearlyTables.innerHTML = "";

    const prevUser = filterUser.value;
    const prevManager = filterManager.value;

    const { start, end } = computeDateRange();
    const rows = await fetchRange(start, end);

    fillDropdowns(rows, prevUser, prevManager);
    const filtered = applyUserFilters(rows);

    if (filtered.length === 0) {
      showNoDataMessage();
      return;
    }

    if (filterType.value === "year") {
      scoreCards.style.display = "none";
      renderYearlyTables(filtered);
    } else {
      scoreCards.style.display = "grid";
      renderCards(computeUserStats(filtered));
    }
  }

  /* ================= DATE RANGE ================= */
function computeDateRange() {
  filterDate.style.display = "none";
  monthPicker.style.display = "none";
  yearPicker.style.display = "none";

  // DAILY
  if (filterType.value === "day") {
    filterDate.style.display = "inline-block";
    return { start: filterDate.value, end: filterDate.value };
  }

  // WEEKLY ✅ FIXED
  if (filterType.value === "week") {
    filterDate.style.display = "inline-block";

    const base = new Date(filterDate.value);
    const day = base.getDay(); // 0 (Sun) - 6 (Sat)

    // Monday as first day
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10)
    };
  }

  // MONTHLY
  if (filterType.value === "month") {
    monthPicker.style.display = "inline-block";
    const [y, m] = monthPicker.value.split("-");
    return {
      start: new Date(y, m - 1, 1).toISOString().slice(0, 10),
      end: new Date(y, m, 0).toISOString().slice(0, 10)
    };
  }

  // YEARLY
  if (filterType.value === "year") {
    yearPicker.style.display = "inline-block";
    const y = yearPicker.value;
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  return { start: filterDate.value, end: filterDate.value };
}

/* ================= FETCH RANGE ================= */
async function fetchRange(start, end) {
  try {
    const res = await fetch(
      `${API}/api/all-status-range?start=${start}&end=${end}`
    );
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

  /* ================= DROPDOWNS ================= */
  function fillDropdowns(rows, pu, pm) {
    const users = [...new Set(rows.map(r => r.username).filter(Boolean))];
    const managers = [...new Set(rows.map(r => r.manager).filter(Boolean))];

    filterUser.innerHTML =
      `<option value="">All Users</option>` +
      users.map(u => `<option>${u}</option>`).join("");

    filterManager.innerHTML =
      `<option value="">All Managers</option>` +
      managers.map(m => `<option>${m}</option>`).join("");

    if (pu) filterUser.value = pu;
    if (pm) filterManager.value = pm;
  }

  function applyUserFilters(rows) {
    return rows.filter(r => {
      if (filterUser.value && r.username !== filterUser.value) return false;
      if (filterManager.value && r.manager !== filterManager.value) return false;
      return true;
    });
  }

  /* ================= CARDS ================= */
  function computeUserStats(rows) {
    const map = {};
    rows.forEach(r => {
      const u = r.username;
      map[u] ??= { yes: 0, no: 0, total: 0, score: 0 };
      map[u].total++;
      if (r.status === "Yes") { map[u].yes++; map[u].score++; }
      if (r.status === "No") { map[u].no++; map[u].score--; }
    });
    return map;
  }

  function renderCards(stats) {
    scoreCards.innerHTML = "";

    Object.entries(stats).forEach(([u, s]) => {
      const efficiency = ((s.yes / s.total) * 100 || 0).toFixed(1);
      const delay = (100 - efficiency).toFixed(1);

      const scoreClass =
        s.score > 0 ? "score-positive" :
        s.score < 0 ? "score-negative" :
        "score-zero";

      scoreCards.innerHTML += `
        <div class="card">
          <h2>${u}</h2>
          <div class="score ${scoreClass}">${s.score}</div>
          <div class="metric">📋 Total Tasks: <b>${s.total}</b></div>
          <div class="metric">✅ Efficiency: <b>${efficiency}%</b></div>
          <div class="metric delay">⏳ Delay: <b>${delay}%</b></div>
        </div>`;
    });
  }

  /* ================= YEARLY TABLE ================= */
  function renderYearlyTables(rows) {
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    const users = [...new Set(rows.map(r => r.username))];

    users.forEach(user => {
      const userRows = rows.filter(r => r.username === user);
      const months = {};

      userRows.forEach(r => {
        const d = new Date(r.date || r.task_date || r.created_at);
        const m = d.getMonth();
        months[m] ??= [];
        months[m].push(r);
      });

      let tbody = "";

      Object.entries(months).forEach(([m, rowsOfMonth]) => {
        const stats = computeUserStats(rowsOfMonth)[user];
        const efficiency = ((stats.yes / stats.total) * 100 || 0).toFixed(1);
        const delay = (100 - efficiency).toFixed(1);

        const scoreClass =
          stats.score > 0 ? "green" :
          stats.score < 0 ? "red" :
          "neutral";

        const key = `${user}-${m}`;

        tbody += `
          <tr>
            <td>
              <button class="toggle" data-key="${key}">➕</button>
              ${monthNames[m]}
            </td>
            <td>${stats.total}</td>
            <td class="${scoreClass}">${stats.score}</td>
            <td class="green">${efficiency}%</td>
            <td class="red">${delay}%</td>
          </tr>
          <tr class="weekly-row" data-key="${key}">
            <td colspan="5">${renderWeeklyBreakdown(rowsOfMonth)}</td>
          </tr>`;
      });

      yearlyTables.innerHTML += `
        <div class="user-table">
          <h3>${user} – ${yearPicker.value}</h3>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Total Tasks</th>
                <th>Score</th>
                <th>Efficiency</th>
                <th>Delay</th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>`;
    });

    bindToggleEvents();
  }

  /* ================= WEEKLY ================= */
  function renderWeeklyBreakdown(rows) {
    const weeks = {};

    rows.forEach(r => {
      const d = new Date(r.date || r.task_date || r.created_at);
      const week = Math.ceil(d.getDate() / 7);

      weeks[week] ??= { yes: 0, no: 0, total: 0, score: 0 };
      weeks[week].total++;

      if (r.status === "Yes") { weeks[week].yes++; weeks[week].score++; }
      if (r.status === "No") { weeks[week].no++; weeks[week].score--; }
    });

    let html = `<table class="inner-table">
      <tr>
        <th>Week</th>
        <th>Total Tasks</th>
        <th>Score</th>
        <th>Efficiency</th>
        <th>Delay</th>
      </tr>`;

    Object.entries(weeks).forEach(([w, s]) => {
      const efficiency = ((s.yes / s.total) * 100 || 0).toFixed(1);
      const delay = (100 - efficiency).toFixed(1);

      const scoreClass =
        s.score > 0 ? "green" :
        s.score < 0 ? "red" :
        "neutral";

      html += `
        <tr>
          <td>Week ${w}</td>
          <td>${s.total}</td>
          <td class="${scoreClass}">${s.score}</td>
          <td class="green">${efficiency}%</td>
          <td class="red">${delay}%</td>
        </tr>`;
    });

    return html + `</table>`;
  }

  /* ================= TOGGLE ================= */
  function bindToggleEvents() {
    document.querySelectorAll(".toggle").forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        const row = document.querySelector(`.weekly-row[data-key="${key}"]`);
        const open = row.classList.toggle("open");
        btn.textContent = open ? "➖" : "➕";
      };
    });
  }

  /* ================= NO DATA ================= */
  function showNoDataMessage() {
    const msg =
      filterType.value === "day"
        ? "No data available for this day."
        : filterType.value === "month"
        ? "No data available for this month."
        : "No data available for this year.";

    if (filterType.value === "year") {
      yearlyTables.innerHTML = `<p class="no-data">${msg}</p>`;
    } else {
      scoreCards.innerHTML = `<p class="no-data">${msg}</p>`;
    }
  }

  loadScores();
})();
