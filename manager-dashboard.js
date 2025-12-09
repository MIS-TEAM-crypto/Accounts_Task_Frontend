// manager-dashboard.js
const API_BASE_URL = 'https://accounts-task-backend-1.onrender.com';

(() => {
  const role = sessionStorage.getItem('role');
  if (role !== 'manager') {
    sessionStorage.clear();
    location.href = 'manager-login.html';
    return;
  }

  const fullname = sessionStorage.getItem('fullname') || 'Manager';
  const managerName = fullname; // must match "Manager" in Tasks sheet

  const greetEl = document.getElementById('greet');
  const dateInput = document.getElementById('taskDate');
  const refreshBtn = document.getElementById('refreshBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const containerEl = document.getElementById('managerTaskContainer');
  const taskMsgEl = document.getElementById('taskMessage');
  const userFilter = document.getElementById('userFilter');

  greetEl.textContent = `Hello, ${fullname}`;

  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.value = todayStr;

  // key: "username::idx" -> 'Yes' | 'No'
  const selectionState = new Map();
  let allTasks = [];
  let viewTasks = [];
  let teamUsers = []; // all users under this manager

  function escapeHtml(s) {
    return (s + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------- HELPERS ----------

  function buildTeamUsers(tasks) {
    const set = new Set();
    tasks.forEach((t) => {
      const uname = (t.username || '').toString().trim();
      if (uname) set.add(uname);
    });
    teamUsers = Array.from(set).sort();
  }

  async function sendStatusUpdate(username, task, status, dateForUpdate) {
    const payload = {
      username,
      task,
      manager: managerName,
      date: dateForUpdate,
      status // '' = clear status
    };

    try {
      await fetch(`${API_BASE_URL}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to update status (manager)', err);
    }
  }

  async function sendAssignRequestManager(fromUser, task, dateForUpdate, assignee) {
    const payload = {
      username: fromUser,      // original owner of the task
      task,
      manager: managerName,
      date: dateForUpdate,
      assignTo: assignee       // new user
    };

    const res = await fetch(`${API_BASE_URL}/assign-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Assign failed');
    }
    return data;
  }

  // ---------- MAIN FUNCTION ----------

  async function fetchManagerTasks() {
    taskMsgEl.textContent = 'Loading tasks...';
    containerEl.innerHTML = '';
    selectionState.clear();

    const dateStr = dateInput.value || todayStr;
    const url = `${API_BASE_URL}/manager-tasks?manager=${encodeURIComponent(
      managerName
    )}&date=${encodeURIComponent(dateStr)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error from server');

      allTasks = data.data || [];
      buildTeamUsers(allTasks);
      populateUserDropdown(allTasks);
      applyFiltersAndRender();
    } catch (err) {
      console.error(err);
      taskMsgEl.textContent = 'Error loading tasks. Please try again.';
    }
  }

  function populateUserDropdown(tasks) {
    const currentValue = userFilter.value || 'all';

    const userSet = new Set();
    tasks.forEach((t) => {
      const uname = (t.username || '').toString().trim();
      if (uname) userSet.add(uname);
    });

    userFilter.innerHTML = '<option value="all">All Users</option>';
    userSet.forEach((uname) => {
      const opt = document.createElement('option');
      opt.value = uname;
      opt.textContent = uname;
      userFilter.appendChild(opt);
    });

    if (currentValue && (currentValue === 'all' || userSet.has(currentValue))) {
      userFilter.value = currentValue;
    } else {
      userFilter.value = 'all';
    }
  }

  function applyFiltersAndRender() {
    const selectedUser = userFilter.value || 'all';
    if (selectedUser === 'all') {
      viewTasks = allTasks.slice();
    } else {
      viewTasks = allTasks.filter((t) => (t.username || '') === selectedUser);
    }
    renderManagerView(viewTasks);
  }

  // Render logic now mirrors the user-dashboard rendering for parity.
  function renderManagerView(tasks) {
    containerEl.innerHTML = '';
    selectionState.clear();

    if (!tasks.length) {
      taskMsgEl.textContent = 'No tasks found for your team.';
      return;
    }

    taskMsgEl.textContent = '';

    const currentDate = dateInput.value || todayStr;

    // Group tasks by username (so manager sees each user's tasks grouped exactly how user sees them)
    const grouped = {};
    tasks.forEach((t, idx) => {
      const uname = t.username || 'Unknown';
      if (!grouped[uname]) grouped[uname] = [];
      grouped[uname].push({ t, idx });
    });

    Object.keys(grouped).forEach((uname) => {
      const userSection = document.createElement('section');
      userSection.className = 'user-block';

      userSection.innerHTML = `
        <div class="user-header">
          <h3>User: ${escapeHtml(uname)}</h3>
        </div>
        <div class="task-list interactive" data-user="${escapeHtml(uname)}"></div>
      `;

      const listEl = userSection.querySelector('.task-list');
      const userTasks = grouped[uname];

      userTasks.forEach(({ t, idx }) => {
        const kind = t.kind || 'today'; // 'today' | 'pending'
        const isPendingRow = kind === 'pending';
        const status = (t.status || '').trim();
        const assignedDate = (t.assignedDate || '').trim();
        const completionDate = (t.completionDate || '').trim();
        const rowDate = t.date || currentDate;

        // assignedBy: who assigned this task to this user (if any)
        const assignedBy = (t.assignedBy || '').trim();
        // delegatedTo: if this user delegated (assigned away) this task to someone today
        const delegatedTo = (t.delegatedTo || '').trim();

        let metaLines = '';

        // Kind pill
        if (isPendingRow) {
          metaLines += `<span class="task-kind-pill">Previous Pending</span>`;
        } else {
          metaLines += `<span class="task-kind-pill">Today</span>`;
        }

        // Pending info only on pending row
        if (isPendingRow && assignedDate) {
          metaLines += `<p class="task-pending">Pending from ${escapeHtml(assignedDate)}</p>`;
        }

        // Completion info: show if completionDate exists (manager can see completed history)
        if (completionDate) {
          metaLines += `<p class="task-completed">Completed on ${escapeHtml(completionDate)}</p>`;
        }

        // Assigned info
        if (assignedBy) {
          metaLines += `<p class="task-assigned-by">Assigned by ${escapeHtml(assignedBy)}</p>`;
        }
        if (delegatedTo) {
          metaLines += `<p class="task-assigned-to">Assigned to ${escapeHtml(delegatedTo)}</p>`;
        }

        const row = document.createElement('div');
        row.className = 'task task-interactive';
        if (isPendingRow) row.classList.add('task-pending-row');
        row.dataset.user = uname;
        row.dataset.index = String(idx);

        const canAssign = !isPendingRow && !delegatedTo; // cannot assign if already delegated
        const isLocked = !!delegatedTo;

        // Manager assign options: all team users except the original user (you can allow manager self-assign if desired)
        const assignOptionsHtml = teamUsers
          .filter((u) => u && u !== uname)
          .map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`)
          .join('');

        const assignDropdownHtml = canAssign
          ? `
            <div class="assign-ui hidden" data-user="${escapeHtml(uname)}" data-index="${idx}">
              <select class="assign-select">
                <option value="">-- Assign to --</option>
                ${assignOptionsHtml}
              </select>
              <button class="assign-confirm"
                      data-user="${escapeHtml(uname)}"
                      data-index="${idx}"
                      data-task="${escapeHtml(t.task || '')}"
                      data-date="${escapeHtml(rowDate)}">OK</button>
              <button class="assign-cancel"
                      data-user="${escapeHtml(uname)}"
                      data-index="${idx}">Cancel</button>
            </div>
          `
          : '';

        let actionsHtml = '';
        if (isLocked) {
          actionsHtml = `
            <div class="task-actions">
              <span class="task-locked-msg">Assigned to ${escapeHtml(delegatedTo)}</span>
            </div>
          `;
        } else {
          actionsHtml = `
            <div class="task-actions">
              <button class="btn-yes"
                      data-user="${escapeHtml(uname)}"
                      data-index="${idx}"
                      data-task="${escapeHtml(t.task || '')}"
                      data-date="${escapeHtml(rowDate)}">Yes</button>
              <button class="btn-no"
                      data-user="${escapeHtml(uname)}"
                      data-index="${idx}"
                      data-task="${escapeHtml(t.task || '')}"
                      data-date="${escapeHtml(rowDate)}">No</button>
              <button class="btn-assign"
                      data-user="${escapeHtml(uname)}"
                      data-index="${idx}">Assign</button>
              ${assignDropdownHtml}
            </div>
          `;
        }

        row.innerHTML = `
          <div class="meta">
            <h4>${escapeHtml(t.task || '')}</h4>
            <p class="manager-name">Manager: ${escapeHtml(t.manager || managerName)}</p>
            ${metaLines}
          </div>
          ${actionsHtml}
        `;

        listEl.appendChild(row);

        // Pre-select based on current status (only today's non-delegated row)
        if (!isPendingRow && !delegatedTo && (status === 'Yes' || status === 'No')) {
          const key = `${uname}::${idx}`;
          selectionState.set(key, status);
          const btnSelector = status === 'Yes' ? '.btn-yes' : '.btn-no';
          const btn = row.querySelector(btnSelector);
          if (btn) btn.classList.add('selected');
        }
      });

      containerEl.appendChild(userSection);
    });
  }

  // ---------- EVENTS ----------

  // Handle Yes/No + Assign buttons
  containerEl.addEventListener('click', async (e) => {
    try {
      // --- Assign confirm ---
      const assignConfirm = e.target.closest('.assign-confirm');
      if (assignConfirm) {
        const uname = assignConfirm.dataset.user;
        const idx = Number(assignConfirm.dataset.index);
        if (!uname || Number.isNaN(idx)) return;

        const panel = assignConfirm.closest('.assign-ui');
        if (!panel) return;

        const selectEl = panel.querySelector('.assign-select');
        const assignee = selectEl ? selectEl.value : '';
        if (!assignee) {
          alert('Please select a user to assign this task.');
          return;
        }

        const task = assignConfirm.dataset.task || '';
        const dateForUpdate =
          assignConfirm.dataset.date || (dateInput.value || todayStr);

        const msg = `Are you sure you want to assign "${task}" from "${uname}" to "${assignee}" for ${dateForUpdate}?`;
        if (!confirm(msg)) return;

        await sendAssignRequestManager(uname, task, dateForUpdate, assignee);
        await fetchManagerTasks();
        return;
      }

      // --- Assign cancel ---
      const assignCancel = e.target.closest('.assign-cancel');
      if (assignCancel) {
        const panel = assignCancel.closest('.assign-ui');
        if (panel) panel.classList.add('hidden');
        return;
      }

      // --- Assign button: toggle dropdown ---
      const assignBtn = e.target.closest('.btn-assign');
      if (assignBtn) {
        const uname = assignBtn.dataset.user;
        const idx = Number(assignBtn.dataset.index);
        if (!uname || Number.isNaN(idx)) return;

        const row = assignBtn.closest('.task');
        if (!row) return;
        // find panel relative to this row (try to match exact panel)
        let panel = row.querySelector(`.assign-ui[data-user="${CSS.escape(uname)}"][data-index="${idx}"]`);
        if (!panel) {
          // fallback: any assign-ui in the row
          panel = row.querySelector('.assign-ui');
        }
        if (panel) panel.classList.toggle('hidden');
        return;
      }

      // --- Yes/No buttons (toggle-off behaviour) ---
      const yesBtn = e.target.closest('.btn-yes');
      const noBtn = e.target.closest('.btn-no');
      if (!yesBtn && !noBtn) return;

      const btn = yesBtn || noBtn;
      const uname = btn.dataset.user;
      const idx = Number(btn.dataset.index);
      if (!uname || Number.isNaN(idx)) return;

      const task = btn.dataset.task || '';
      const dateForUpdate = btn.dataset.date || (dateInput.value || todayStr);
      const key = `${uname}::${idx}`;

      const newStatus = yesBtn ? 'Yes' : 'No';
      const prevStatus = selectionState.get(key) || null;

      const parentTask = btn.closest('.task');
      if (!parentTask) return;

      // Clear UI selection first
      parentTask.querySelectorAll('.btn-yes, .btn-no').forEach((b) => {
        b.classList.remove('selected');
      });

      // If clicking same status again -> toggle OFF
      if (prevStatus === newStatus) {
        selectionState.delete(key);
        sendStatusUpdate(uname, task, '', dateForUpdate);
        return;
      }

      // Normal selection
      selectionState.set(key, newStatus);
      btn.classList.add('selected');
      sendStatusUpdate(uname, task, newStatus, dateForUpdate);
    } catch (err) {
      console.error('Error in manager click handler', err);
      alert('Something went wrong. Please try again.');
    }
  });

  dateInput.addEventListener('change', fetchManagerTasks);
  refreshBtn.addEventListener('click', fetchManagerTasks);
  userFilter.addEventListener('change', applyFiltersAndRender);

  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    location.href = 'index.html';
  });

  // Initial load
  fetchManagerTasks();
})();
