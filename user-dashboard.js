// user-dashboard.js

const API_BASE_URL = 'https://accounts-task-backend-1.onrender.com';

(function () {
  const role = sessionStorage.getItem('role');
  const username = sessionStorage.getItem('username');
  const fullname = sessionStorage.getItem('fullname') || username;

  if (role !== 'user' || !username) {
    sessionStorage.clear();
    window.location.href = 'user-login.html';
    return;
  }

  const greetEl = document.getElementById('greet');
  const dateInput = document.getElementById('taskDate');
  const refreshBtn = document.getElementById('refreshBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const taskListEl = document.getElementById('taskList');
  const taskMsgEl = document.getElementById('taskMessage');

  greetEl.textContent = `Hello, ${fullname}`;

  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.value = todayStr;

  // index -> 'Yes' | 'No'
  const selectionState = new Map();
  let currentTasks = [];
  let teamUsers = []; // teammates under same manager (for Assign dropdown)

  function escapeHtml(s) {
    return (s + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------- API CALLS ----------

  async function fetchUserTasks() {
    taskMsgEl.textContent = 'Loading tasks...';
    taskListEl.innerHTML = '';
    selectionState.clear();

    const dateStr = dateInput.value || todayStr;

    const url = `${API_BASE_URL}/user-tasks?username=${encodeURIComponent(
      username
    )}&date=${encodeURIComponent(dateStr)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error from server');

      currentTasks = data.data || [];
      renderTasks(currentTasks);
    } catch (err) {
      console.error(err);
      taskMsgEl.textContent = 'Error loading tasks. Please try again.';
    }
  }

  async function fetchTeamUsers() {
    try {
      const url = `${API_BASE_URL}/user-team?username=${encodeURIComponent(
        username
      )}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      const all = data.data || [];
      teamUsers = all.filter((u) => u && u !== username);
    } catch (err) {
      console.error('Failed to load team users', err);
    }
  }

  async function sendStatusUpdate(task, managerName, status, dateForUpdate) {
    const payload = {
      username,
      task,
      manager: managerName,
      date: dateForUpdate,
      status // '' means clear status
    };

    try {
      await fetch(`${API_BASE_URL}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  async function sendAssignRequest(task, managerName, dateForUpdate, assignee) {
    const payload = {
      username,
      task,
      manager: managerName,
      date: dateForUpdate,
      assignTo: assignee
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

  // ---------- RENDERING ----------

  function renderTasks(tasks) {
    taskListEl.innerHTML = '';
    selectionState.clear();

    if (!tasks.length) {
      taskMsgEl.textContent = 'No tasks assigned.';
      return;
    }

    taskMsgEl.textContent = '';

    const currentDate = dateInput.value || todayStr;

    tasks.forEach((t, index) => {
      const kind = t.kind || 'today'; // 'today' | 'pending'
      const isPendingRow = kind === 'pending';
      const status = (t.status || '').trim();
      const assignedDate = (t.assignedDate || '').trim();
      const completionDate = (t.completionDate || '').trim();
      const rowDate = t.date || currentDate; // important for pending rows

      const assignedBy = (t.assignedBy || '').trim();  // who gave the task to me
      const delegatedTo = (t.delegatedTo || '').trim(); // to whom I delegated today

      let metaLines = '';

      // Kind pill
      if (isPendingRow) {
        metaLines += `<span class="task-kind-pill">Previous Pending</span>`;
      } else {
        metaLines += `<span class="task-kind-pill">Today</span>`;
      }

      // Pending info only on pending row
      if (isPendingRow && assignedDate) {
        metaLines += `<p class="task-pending">Pending from ${escapeHtml(
          assignedDate
        )}</p>`;
      }

      // Completion info (on the completion date for the TODAY row)
      if (!isPendingRow && completionDate && completionDate === currentDate) {
        metaLines += `<p class="task-completed">Completed on ${escapeHtml(
          completionDate
        )}</p>`;
      }

      // Assigned info
      if (assignedBy) {
        metaLines += `<p class="task-assigned-by">Assigned by ${escapeHtml(
          assignedBy
        )}</p>`;
      }
      if (delegatedTo) {
        metaLines += `<p class="task-assigned-to">Assigned to ${escapeHtml(
          delegatedTo
        )}</p>`;
      }

      const row = document.createElement('div');
      row.className = 'task task-interactive';
      if (isPendingRow) {
        row.classList.add('task-pending-row');
      }
      row.dataset.index = index;

      const canAssign = !isPendingRow && !delegatedTo; // cannot assign if already delegated
      const isLocked = !!delegatedTo; // if delegated away, no Yes/No

      let actionsHtml = '';

      if (isLocked) {
        // Row is locked because user delegated it away
        actionsHtml = `
          <div class="task-actions">
            <span class="task-locked-msg">You have assigned this task to ${escapeHtml(
              delegatedTo
            )}.</span>
          </div>
        `;
      } else {
        const assignDropdownHtml = canAssign
          ? `
            <div class="assign-ui hidden" data-index="${index}">
              <select class="assign-select">
                <option value="">-- Assign to --</option>
                ${teamUsers
                  .filter((u) => u !== username)
                  .map(
                    (u) =>
                      `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`
                  )
                  .join('')}
              </select>
              <button class="assign-confirm" data-index="${index}">OK</button>
              <button class="assign-cancel" data-index="${index}">Cancel</button>
            </div>
          `
          : '';

        actionsHtml = `
          <div class="task-actions">
            <button class="btn-yes"
                    data-index="${index}"
                    data-task="${escapeHtml(t.task || '')}"
                    data-manager="${escapeHtml(t.manager || '')}"
                    data-date="${escapeHtml(rowDate)}">Yes</button>
            <button class="btn-no"
                    data-index="${index}"
                    data-task="${escapeHtml(t.task || '')}"
                    data-manager="${escapeHtml(t.manager || '')}"
                    data-date="${escapeHtml(rowDate)}">No</button>
            ${
              canAssign
                ? `<button class="btn-assign" data-index="${index}">Assign</button>`
                : ''
            }
            ${assignDropdownHtml}
          </div>
        `;
      }

      row.innerHTML = `
        <div class="meta">
          <h4>${escapeHtml(t.task || '')}</h4>
          <p class="manager-name">Manager: ${escapeHtml(t.manager || 'N/A')}</p>
          ${metaLines}
        </div>
        ${actionsHtml}
      `;

      taskListEl.appendChild(row);

      // Pre-select based on current status (only for today's non-delegated row)
      if (!isPendingRow && !delegatedTo && (status === 'Yes' || status === 'No')) {
        selectionState.set(index, status);
        const btnSelector = status === 'Yes' ? '.btn-yes' : '.btn-no';
        const btn = row.querySelector(btnSelector);
        if (btn) btn.classList.add('selected');
      }
    });
  }

  // ---------- EVENTS ----------

  // Handle clicks: Assign (open/confirm/cancel) + Yes/No toggle behaviour
  taskListEl.addEventListener('click', async (e) => {
    try {
      // --- Assign confirm ---
      const assignConfirm = e.target.closest('.assign-confirm');
      if (assignConfirm) {
        const index = Number(assignConfirm.dataset.index);
        if (Number.isNaN(index)) return;

        const panel = assignConfirm.closest('.assign-ui');
        if (!panel) return;

        const selectEl = panel.querySelector('.assign-select');
        const assignee = selectEl ? selectEl.value : '';
        if (!assignee) {
          alert('Please select a user to assign this task.');
          return;
        }

        const t = currentTasks[index];
        if (!t) return;

        const dateForUpdate = t.date || dateInput.value || todayStr;
        const msg = `Are you sure you want to assign "${t.task}" to "${assignee}" for ${dateForUpdate}?\n\nAfter assigning, you will not be able to mark Yes/No for this task on this date.`;
        if (!confirm(msg)) return;

        await sendAssignRequest(t.task || '', t.manager || '', dateForUpdate, assignee);
        await fetchUserTasks();
        return;
      }

      // --- Assign cancel ---
      const assignCancel = e.target.closest('.assign-cancel');
      if (assignCancel) {
        const panel = assignCancel.closest('.assign-ui');
        if (panel) panel.classList.add('hidden');
        return;
      }

      // --- Assign button: show/hide dropdown ---
      const assignBtn = e.target.closest('.btn-assign');
      if (assignBtn) {
        const index = Number(assignBtn.dataset.index);
        if (Number.isNaN(index)) return;
        const row = assignBtn.closest('.task');
        if (!row) return;
        const panel = row.querySelector(`.assign-ui[data-index="${index}"]`);
        if (!panel) return;
        panel.classList.toggle('hidden');
        return;
      }

      // --- Yes/No buttons (toggle-off behaviour) ---
      const yesBtn = e.target.closest('.btn-yes');
      const noBtn = e.target.closest('.btn-no');
      if (!yesBtn && !noBtn) return;

      const btn = yesBtn || noBtn;
      const index = Number(btn.dataset.index);
      if (Number.isNaN(index)) return;

      const task = btn.dataset.task || '';
      const managerName = btn.dataset.manager || '';
      const dateForUpdate = btn.dataset.date || (dateInput.value || todayStr);

      const newStatus = yesBtn ? 'Yes' : 'No';
      const prevStatus = selectionState.get(index) || null;

      const row = btn.closest('.task');
      if (!row) return;

      // Clear all selected classes first
      row.querySelectorAll('.btn-yes, .btn-no').forEach((b) => {
        b.classList.remove('selected');
      });

      // If same button clicked again -> toggle OFF
      if (prevStatus === newStatus) {
        selectionState.delete(index);
        // send empty status to clear it on backend
        sendStatusUpdate(task, managerName, '', dateForUpdate);
        return;
      }

      // Normal selection
      selectionState.set(index, newStatus);
      btn.classList.add('selected');
      sendStatusUpdate(task, managerName, newStatus, dateForUpdate);
    } catch (err) {
      console.error('Error handling click', err);
      alert('Something went wrong. Please try again.');
    }
  });

  leaveBtn.addEventListener('click', async () => {
    const confirmLeave = confirm('Mark all tasks as No for this date?');
    if (!confirmLeave) return;

    const dateStr = dateInput.value || todayStr;
    const payload = {
      username,
      manager: '',
      date: dateStr
    };

    try {
      await fetch(`${API_BASE_URL}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await fetchUserTasks();
      alert('Leave marked for all tasks (No for this date).');
    } catch (err) {
      console.error('Failed to submit leave', err);
      alert('Error submitting leave.');
    }
  });

  dateInput.addEventListener('change', fetchUserTasks);
  refreshBtn.addEventListener('click', fetchUserTasks);

  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // Initial load
  fetchTeamUsers();
  fetchUserTasks();
})();
