const API = "https://accounts-task-backend-1.onrender.com";

(() => {
  const role = sessionStorage.getItem("role");
  if (role !== "admin") {
    sessionStorage.clear();
    location.href = "admin-login.html";
    return;
  }

  document.getElementById("greet").textContent =
    "Hello, " + (sessionStorage.getItem("fullname") || "Admin");

  const filterType = document.getElementById("filterType");
  const filterDate = document.getElementById("filterDate");
  const filterUser = document.getElementById("filterUser");
  const filterManager = document.getElementById("filterManager");
  const scoreCards = document.getElementById("scoreCards");

  filterDate.value = new Date().toISOString().slice(0, 10);

  document.getElementById("refreshBtn").onclick = loadScores;
  document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.clear();
    location.href = "index.html";
  };

  // 🔹 Re-load when filters change
  filterUser.addEventListener("change", loadScores);
  filterManager.addEventListener("change", loadScores);
  filterType.addEventListener("change", loadScores);
  filterDate.addEventListener("change", loadScores);

  // ---------- MAIN FUNCTION ----------
  async function loadScores() {
    scoreCards.innerHTML = "<p>Loading...</p>";

    const { start, end } = computeDateRange();
    const allRows = await fetchRange(start, end);

    if (!allRows) {
      scoreCards.innerHTML = "<p>Error loading scores</p>";
      return;
    }

    // 🔹 Save currently selected filters
    const prevUser = filterUser.value;
    const prevManager = filterManager.value;

    // 🔹 Rebuild dropdowns but keep previous selections if possible
    fillDropdowns(allRows, prevUser, prevManager);

    const filteredRows = applyUserFilters(allRows);
    const scoreMap = computeTotalScores(filteredRows);

    renderCards(scoreMap);
  }

  // ---------- DATE RANGE LOGIC ----------
  function computeDateRange() {
    const type = filterType.value;
    const baseDate = new Date(filterDate.value);

    let start, end;

    if (type === "day") {
      start = filterDate.value;
      end = filterDate.value;
    }

    if (type === "week") {
      const d = new Date(baseDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = first day
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(d.setDate(diff + 6));

      start = monday.toISOString().slice(0, 10);
      end = sunday.toISOString().slice(0, 10);
    }

    if (type === "month") {
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);

      start = first.toISOString().slice(0, 10);
      end = last.toISOString().slice(0, 10);
    }

    return { start, end };
  }

  // ---------- FETCH RANGE ----------
  async function fetchRange(start, end) {
    try {
      const params = new URLSearchParams();
      params.append("start", start);
      params.append("end", end);

      const res = await fetch(`${API}/all-status-range?${params.toString()}`);
      return (await res.json()).data;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  // ---------- FILL DROPDOWNS ----------
  function fillDropdowns(rows, prevUser = "", prevManager = "") {
    const userSet = new Set();
    const managerSet = new Set();

    rows.forEach(r => {
      if (r.username) userSet.add(r.username);
      if (r.manager) managerSet.add(r.manager);
    });

    // Users
    let userOptions = `<option value="">All Users</option>`;
    [...userSet].forEach(u => {
      userOptions += `<option value="${u}">${u}</option>`;
    });
    filterUser.innerHTML = userOptions;

    // Managers
    let managerOptions = `<option value="">All Managers</option>`;
    [...managerSet].forEach(m => {
      managerOptions += `<option value="${m}">${m}</option>`;
    });
    filterManager.innerHTML = managerOptions;

    // 🔹 Restore previous selection if it still exists
    if (prevUser && userSet.has(prevUser)) {
      filterUser.value = prevUser;
    }
    if (prevManager && managerSet.has(prevManager)) {
      filterManager.value = prevManager;
    }
  }

  // ---------- FILTER BY USER/MANAGER ----------
  function applyUserFilters(rows) {
    return rows.filter(r => {
      if (filterUser.value && r.username !== filterUser.value) return false;
      if (filterManager.value && r.manager !== filterManager.value) return false;
      return true;
    });
  }

  // ---------- COMPUTE TOTAL SCORE ----------
  function computeTotalScores(rows) {
    const scoreMap = {};

    rows.forEach(r => {
      const user = r.username || "Unknown";
      if (!scoreMap[user]) scoreMap[user] = 0;

      if (r.status === "Yes") scoreMap[user] += 1;
      if (r.status === "No") scoreMap[user] -= 1;
    });

    return scoreMap;
  }

  // ---------- RENDER CARDS ----------
  function renderCards(scoreMap) {
    scoreCards.innerHTML = "";

    if (Object.keys(scoreMap).length === 0) {
      scoreCards.innerHTML = "<p>No data for selected filters.</p>";
      return;
    }

    Object.entries(scoreMap).forEach(([user, score]) => {
      const div = document.createElement("div");
      div.className = "card";

      let scoreClass =
        score > 0 ? "score-positive" :
        score < 0 ? "score-negative" :
        "score-zero";

      div.innerHTML = `
        <h2>${user}</h2>
        <div class="score ${scoreClass}">${score}</div>
      `;

      scoreCards.appendChild(div);
    });
  }

  loadScores();
})();
