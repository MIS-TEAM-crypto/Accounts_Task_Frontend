const API = "https://accounts-task-backend-1.onrender.com";

let taskTotals = {};
let dropdownInitialized = false;
let allUsersManagers = { users: [], managers: [] };



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
    const [rows, totals] = await Promise.all([
    fetchRange(start, end),
    fetchTaskTotals()
    ]);

    taskTotals = totals; // ✅ assign to global


if (!dropdownInitialized) {
  fillDropdowns();
  dropdownInitialized = true;
}

const filtered = applyUserFilters(rows);


    if (!filtered.length) {
      showNoDataMessage();
      return;
    }

    if (filterType.value === "day") {
      renderDailyView(filtered);
    } 
    else if (filterType.value === "week") {
      renderWeeklyView(filtered, start, end);
    }
    else if (filterType.value === "month") {
      renderMonthlyView(filtered);
    }
    else {
      scoreCards.style.display = "none";
      renderYearlyTables(filtered); // 🔒 unchanged
    }
  }

  /* ================= DATE RANGE ================= */
  function computeDateRange() {
    filterDate.style.display = "none";
    monthPicker.style.display = "none";
    yearPicker.style.display = "none";

    if (filterType.value === "day") {
      filterDate.style.display = "inline-block";
      return { start: filterDate.value, end: filterDate.value };
    }

    if (filterType.value === "week") {
      filterDate.style.display = "inline-block";
      const base = new Date(filterDate.value);
      const day = base.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(base);
      monday.setDate(base.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().slice(0,10),
        end: sunday.toISOString().slice(0,10)
      };
    }

    if (filterType.value === "month") {
      monthPicker.style.display = "inline-block";
      const [y,m] = monthPicker.value.split("-");
      return {
        start: new Date(y, m-1, 1).toISOString().slice(0,10),
        end: new Date(y, m, 0).toISOString().slice(0,10)
      };
    }

    if (filterType.value === "year") {
      yearPicker.style.display = "inline-block";
      return { start:`${yearPicker.value}-01-01`, end:`${yearPicker.value}-12-31` };
    }
  }

  /* ================= FETCH ================= */
  async function fetchRange(start,end){
    try{
      const res = await fetch(`${API}/api/all-status-range?start=${start}&end=${end}`);
      const json = await res.json();
      return json.data || [];
    }catch(e){
      console.error(e);
      return [];
    }
  }

  // ===== FETCH TASK TOTALS (FROM TASKS SHEET) =====
async function fetchTaskTotals() {
  try {
    const res = await fetch(`${API}/api/task-totals`);
    const json = await res.json();

    const map = {};
    (json.data || []).forEach(r => {
      map[r.username] = r.total;
    });

    return map;
  } catch (e) {
    console.error("Task totals fetch failed", e);
    return {};
  }
}

// ===== FETCH ALL USERS & MANAGERS (MASTER DATA) =====
async function fetchAllUsersManagers() {
  try {
    const res = await fetch(`${API}/api/all-status-range`);
    const json = await res.json();
    const data = json.data || [];

    allUsersManagers.users = [
      ...new Set(data.map(r => r.username).filter(Boolean))
    ];

    allUsersManagers.managers = [
      ...new Set(data.map(r => r.manager).filter(Boolean))
    ];
  } catch (e) {
    console.error("Failed to fetch users/managers", e);
  }
}


  /* ================= DROPDOWNS ================= */
function fillDropdowns() {
  filterUser.innerHTML =
    `<option value="">All Users</option>` +
    allUsersManagers.users.map(u =>
      `<option value="${u}">${u}</option>`
    ).join("");

  filterManager.innerHTML =
    `<option value="">All Managers</option>` +
    allUsersManagers.managers.map(m =>
      `<option value="${m}">${m}</option>`
    ).join("");
}



  function applyUserFilters(rows){
    return rows.filter(r=>{
      if(filterUser.value && r.username!==filterUser.value) return false;
      if(filterManager.value && r.manager!==filterManager.value) return false;
      return true;
    });
  }

  /* ================= DAILY ================= */
  function renderDailyView(rows){
    scoreCards.style.display = "grid";
    const dateLabel = `<div class="highlight-title">📅 ${filterDate.value}</div>`;
    scoreCards.innerHTML = dateLabel;

    const stats = computeUserStats(rows, taskTotals, true);
    Object.entries(stats).forEach(([u,s])=>{
      scoreCards.innerHTML += `
        <div class="card">
          <h2>${u}</h2>
          <div class="score">${s.score}</div>
          <div class="yn">
            <span class="yes">Yes: ${s.yes}</span>
            <span class="no">No: ${s.no}</span>
          </div>
          <div>Total: ${s.total}</div>
          <div>Efficiency: ${s.eff}%</div>
          <div>Delay: ${s.delay}%</div>
        </div>`;
    });
  }

  /* ================= WEEKLY ================= */
function renderWeeklyView(rows,start,end){
  scoreCards.style.display="none";
  monthlyTables.innerHTML="";

  const users=[...new Set(rows.map(r=>r.username))];

  users.forEach(u=>{
    const uRows=rows.filter(r=>r.username===u);
    const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    let map={};

    uRows.forEach(r=>{
      const d=new Date((r.date||r.task_date||r.created_at)+"T00:00:00");
      const idx=(d.getDay()+6)%7;

      map[idx] ??= {
        yes: 0,
        no: 0,
        total: taskTotals[u] || 0,
        score: 0,
        date: d
      };

      if(r.status==="Yes"){ map[idx].yes++; map[idx].score++; }
      if(r.status==="No"){ map[idx].no++; map[idx].score--; }
    });

    let rowsHtml="";
    days.forEach((day,i)=>{
      const s=map[i]||{yes:0,no:0,total:0,score:0,date:""};

      const eff=((s.yes/s.total)*100||0).toFixed(1);
      const delay=((s.no/s.total)*100||0).toFixed(1); // ✅ FIX

      rowsHtml+=`
        <tr>
          <td>${day}</td>
          <td>${s.date?s.date.toISOString().slice(0,10):""}</td>
          <td>${s.total}</td>
          <td>${s.score}</td>
          <td><span class="yes">${s.yes}</span> / <span class="no">${s.no}</span></td>
          <td>${eff}%</td>
          <td>${delay}%</td>
        </tr>`;
    });

    monthlyTables.innerHTML+=`
      <div class="user-table">
        <h3>${u} | Week (${start} → ${end})</h3>
        <table>
          <tr>
            <th>Day</th><th>Date</th><th>Total</th>
            <th>Score</th><th>Yes/No</th><th>Eff%</th><th>Delay%</th>
          </tr>
          ${rowsHtml}
        </table>
      </div>`;
  });
}

/* ================= MONTHLY ================= */
function renderMonthlyView(rows){
  scoreCards.style.display = "none";
  monthlyTables.innerHTML = "";

  const [year, month] = monthPicker.value.split("-").map(Number);
  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });

  /* 🔒 FILTER ROWS STRICTLY BY MONTH & YEAR */
  const monthlyRows = rows.filter(r => {
    const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  const users = [...new Set(monthlyRows.map(r => r.username))];

  users.forEach(u => {
    const uRows = monthlyRows.filter(r => r.username === u);
    const weeks = {};

    uRows.forEach(r => {
      const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");

      /* Week calculation ONLY inside selected month */
      const week = Math.ceil(d.getDate() / 7);

      weeks[week] ??= [];
      weeks[week].push(r);
    });

    let html = "";

    Object.entries(weeks).sort((a,b)=>a[0]-b[0]).forEach(([w, rowsW]) => {
      const stats = computeUserStats(rowsW, taskTotals, true)[u];

        stats.total = sumDailyTotals(rowsW);
        stats.eff = ((stats.yes / stats.total) * 100 || 0).toFixed(1);
        stats.delay = ((stats.no / stats.total) * 100 || 0).toFixed(1);

        ;

      html += `
        <tr>
          <td><button class="toggle" data-key="${u}-${w}">➕</button> Week ${w}</td>
          <td>${stats.total}</td>
          <td>${stats.score}</td>
          <td><span class="yes">${stats.yes}</span>/<span class="no">${stats.no}</span></td>
          <td>${stats.eff}%</td>
          <td>${stats.delay}%</td>
        </tr>
        <tr class="weekly-row" data-key="${u}-${w}">
          <td colspan="6">${renderDailyTable(rowsW)}</td>
        </tr>`;
    });

    monthlyTables.innerHTML += `
      <div class="user-table">
        <h3>${u} | ${monthName} (${year})</h3>
        <table>
          <tr>
            <th>Week</th>
            <th>Total</th>
            <th>Score</th>
            <th>Yes/No</th>
            <th>Eff%</th>
            <th>Delay%</th>
          </tr>
          ${html}
        </table>
      </div>`;
  });

  bindToggleEvents();
}


/* ================= DAILY TABLE ================= */
function renderDailyTable(rows){
  const map = {};

  rows.forEach(r => {
    const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");
    const key = d.toLocaleDateString("en-CA");

    map[key] ??= {
      yes: 0,
      no: 0,
      total: taskTotals[r.username] || 0,
      score: 0
    };

    if (r.status === "Yes") {
      map[key].yes++;
      map[key].score++;
    }

    if (r.status === "No") {
      map[key].no++;
      map[key].score--;
    }
  });

  let html = `
    <table class="inner-table">
      <tr>
        <th>Date</th>
        <th>Total</th>
        <th>Score</th>
        <th>Yes/No</th>
        <th>Eff%</th>
        <th>Delay%</th>
      </tr>`;

  Object.entries(map)
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([date, s]) => {
      const eff = ((s.yes / s.total) * 100 || 0).toFixed(1);
      const delay = ((s.no / s.total) * 100 || 0).toFixed(1); // ✅ FIX

      html += `
        <tr>
          <td>${date}</td>
          <td>${s.total}</td>
          <td>${s.score}</td>
          <td>
            <span class="yes">${s.yes}</span> /
            <span class="no">${s.no}</span>
          </td>
          <td>${eff}%</td>
          <td>${delay}%</td>
        </tr>`;
    });

  return html + "</table>";
}


/* ================= WEEKLY → DAILY ================= */
function renderWeeklyDailyTable(rows){
  const days = [
    "Monday","Tuesday","Wednesday",
    "Thursday","Friday","Saturday","Sunday"
  ];

  const map = {};

  rows.forEach(r => {
    const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");
    const idx = (d.getDay() + 6) % 7;

    map[idx] ??= {
      yes: 0,
      no: 0,
      total: taskTotals[r.username] || 0,
      score: 0,
      date: d
    };

    if (r.status === "Yes") {
      map[idx].yes++;
      map[idx].score++;
    }

    if (r.status === "No") {
      map[idx].no++;
      map[idx].score--;
    }
  });

  let html = `
    <table class="inner-table">
      <tr>
        <th>Day</th>
        <th>Date</th>
        <th>Total</th>
        <th>Score</th>
        <th>Yes/No</th>
        <th>Eff%</th>
        <th>Delay%</th>
      </tr>`;

  days.forEach((day, i) => {
    const s = map[i] || {
      yes: 0,
      no: 0,
      total: 0,
      score: 0,
      date: null
    };

    const eff = ((s.yes / s.total) * 100 || 0).toFixed(1);
    const delay = ((s.no / s.total) * 100 || 0).toFixed(1); // ✅ FIX

    html += `
      <tr>
        <td>${day}</td>
        <td>${s.date ? s.date.toLocaleDateString("en-CA") : ""}</td>
        <td>${s.total}</td>
        <td>${s.score}</td>
        <td>
          <span class="yes">${s.yes}</span> /
          <span class="no">${s.no}</span>
        </td>
        <td>${eff}%</td>
        <td>${delay}%</td>
      </tr>`;
  });

  return html + "</table>";
}


/* ================= HELPERS ================= */
function sumDailyTotals(rows) {
  const perDay = {};

  rows.forEach(r => {
    const date = new Date(
      (r.date || r.task_date || r.created_at) + "T00:00:00"
    ).toLocaleDateString("en-CA");

    // Daily total must come from Tasks sheet
    perDay[date] = taskTotals[r.username] || 0;
  });

  return Object.values(perDay).reduce((a, b) => a + b, 0);
}


  /* ================= STATS ================= */
  function computeUserStats(rows, taskTotals, extra) {
  const map = {};

  rows.forEach(r => {
    const u = r.username;
    if (!u) return;

    map[u] ??= {
      yes: 0,
      no: 0,
      total: taskTotals[u] || 0, // ✅ FROM TASKS SHEET
      score: 0
    };

    if (r.status === "Yes") {
      map[u].yes++;
      map[u].score++;
    }

    if (r.status === "No") {
      map[u].no++;
      map[u].score--;
    }
  });



  if (extra) {
    Object.values(map).forEach(s => {
      s.eff = ((s.yes / s.total) * 100 || 0).toFixed(1);
      s.delay = ((s.no / s.total) * 100 || 0).toFixed(1);
      s.pending = s.total - (s.yes + s.no);

    });
  }

  return map;
}


  /* ================= YEARLY WEEKLY BREAKDOWN (RESTORED) ================= */
function renderWeeklyBreakdown(rows) {
  const weeks = {};

  rows.forEach(r => {
    const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");
    const w = Math.ceil(d.getDate() / 7);

    weeks[w] ??= [];
    weeks[w].push(r);
  });

  let html = `
    <table class="inner-table">
      <tr>
        <th>Week</th>
        <th>Total</th>
        <th>Score</th>
        <th>Efficiency</th>
        <th>Delay</th>
      </tr>
  `;

  Object.entries(weeks).forEach(([w, rowsW]) => {
    const allStats = computeUserStats(rowsW, taskTotals, true);
    const stats = allStats[Object.keys(allStats)[0]];

    stats.total = sumDailyTotals(rowsW);

    const eff = ((stats.yes / stats.total) * 100 || 0).toFixed(1);
    const delay = ((stats.no / stats.total) * 100 || 0).toFixed(1);

    const scoreClass =
      stats.score > 0 ? "green" :
      stats.score < 0 ? "red" :
      "neutral";

    const key = `year-week-${w}-${Math.random()}`;

    html += `
      <tr>
        <td>
          <button class="toggle" data-key="${key}">➕</button>
          Week ${w}
        </td>
        <td>${stats.total}</td>
        <td class="${scoreClass}">${stats.score}</td>
        <td class="green">${eff}%</td>
        <td class="red">${delay}%</td>
      </tr>
      <tr class="weekly-row" data-key="${key}">
        <td colspan="5">
          ${renderWeeklyDailyTable(rowsW)}
        </td>
      </tr>
    `;
  });

  return html + `</table>`;
}


  /* ================= YEARLY (UNCHANGED) ================= */
function renderYearlyTables(rows) {
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const users = [...new Set(rows.map(r => r.username))];
  yearlyTables.innerHTML = "";

  users.forEach(user => {
    const userRows = rows.filter(r => r.username === user);

    const months = {};
    userRows.forEach(r => {
      const d = new Date((r.date || r.task_date || r.created_at) + "T00:00:00");
      const m = d.getMonth();
      months[m] ??= [];
      months[m].push(r);
    });

    let tbody = "";

    Object.entries(months).forEach(([m, rowsOfMonth]) => {
      const stats = computeUserStats(rowsOfMonth, taskTotals, false)[user];

      // ✅ Correct yearly total
      stats.total = sumDailyTotals(rowsOfMonth);

      // ✅ Recalculate everything AFTER total is fixed
      const efficiency = ((stats.yes / stats.total) * 100 || 0).toFixed(1);
      const delay = ((stats.no / stats.total) * 100 || 0).toFixed(1);

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
          <td colspan="5">
            ${renderWeeklyBreakdown(rowsOfMonth)}
          </td>
        </tr>
      `;
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
      </div>
    `;
  });

  bindToggleEvents();
}


  /* ================= TOGGLE ================= */
  function bindToggleEvents(){
    document.querySelectorAll(".toggle").forEach(btn=>{
      btn.onclick=()=>{
        const row=document.querySelector(`.weekly-row[data-key="${btn.dataset.key}"]`);
        const open=row.classList.toggle("open");
        btn.textContent=open?"➖":"➕";
      };
    });
  }

function showNoDataMessage() {
  const msg = `<p class="no-data">No data available</p>`;

  scoreCards.innerHTML = "";
  monthlyTables.innerHTML = "";
  yearlyTables.innerHTML = "";

  if (filterType.value === "day") {
    scoreCards.innerHTML = msg;
  }
  else if (filterType.value === "week" || filterType.value === "month") {
    monthlyTables.innerHTML = msg;
  }
  else if (filterType.value === "year") {
    yearlyTables.innerHTML = msg;
  }
}


  (async () => {
  await fetchAllUsersManagers();  // ✅ STEP 3: CALL IT HERE
  loadScores();                   // existing
})();

})();
