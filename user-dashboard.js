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

  const selectionState = new Map();
  let currentTasks = [];
  let teamUsers = [];

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

    const url = `${API_BASE_URL}/api/user-tasks?username=${encodeURIComponent(
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
      const url = `${API_BASE_URL}/api/user-team?username=${encodeURIComponent(
        username
      )}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const all = data.data || [];
      teamUsers = all.filter((u) => u && u !== username); // remove self
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
      status
    };

    try {
      await fetch(`${API_BASE_URL}/api/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  // <-- CHANGED: include assignedBy and action explicitly so backend definitely records who assigned -->
  async function sendAssignRequest(task, managerName, dateForUpdate, assignee) {
    const payload = {
      action: 'assignTask',
      username,              // original owner (who is assigning)
      task,
      manager: managerName,
      date: dateForUpdate,
      assignTo: assignee,
      assignedBy: username   // explicitly include assigner name
    };

    const res = await fetch(`${API_BASE_URL}/api/assign-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Assign failed');

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
      const kind = t.kind || 'today';
      const isPendingRow = kind === 'pending';
      const status = (t.status || '').trim();
      const assignedDate = (t.assignedDate || '').trim();
      const completionDate = (t.completionDate || '').trim();
      const rowDate = t.date || currentDate;

      const assignedBy = (t.assignedBy || '').trim();
      const delegatedTo = (t.delegatedTo || '').trim();

      let metaLines = '';

      if (isPendingRow) metaLines += `<span class="task-kind-pill">Previous Pending</span>`;
      else metaLines += `<span class="task-kind-pill">Today</span>`;

      if (isPendingRow && assignedDate) {
        metaLines += `<p class="task-pending">Pending from ${escapeHtml(assignedDate)}</p>`;
      }

      if (!isPendingRow && completionDate && completionDate === currentDate) {
        metaLines += `<p class="task-completed">Completed on ${escapeHtml(completionDate)}</p>`;
      }

      if (assignedBy) {
        metaLines += `<p class="task-assigned-by">Assigned by ${escapeHtml(assignedBy)}</p>`;
      }
      if (delegatedTo) {
        metaLines += `<p class="task-assigned-to">Assigned to ${escapeHtml(delegatedTo)}</p>`;
      }

      const row = document.createElement('div');
      row.className = 'task task-interactive';
      if (isPendingRow) row.classList.add('task-pending-row');
      row.dataset.index = index;

      const canAssign = !isPendingRow && !delegatedTo;
      const isLocked = !!delegatedTo;

      let actionsHtml = '';

      if (isLocked) {
        actionsHtml = `
          <div class="task-actions">
            <span class="task-locked-msg">You have assigned this task to ${escapeHtml(delegatedTo)}.</span>
          </div>`;
      } else {
        const assignDropdownHtml = canAssign
          ? `
          <div class="assign-ui hidden" data-index="${index}">
            <select class="assign-select">
              <option value="">-- Assign to --</option>
              ${teamUsers
                .map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`)
                .join('')}
            </select>
            <button class="assign-confirm" data-index="${index}">OK</button>
            <button class="assign-cancel" data-index="${index}">Cancel</button>
          </div>`
          : '';

        actionsHtml = `
          <div class="task-actions">
            <button class="btn-yes"
              data-index="${index}"
              data-task="${escapeHtml(t.task)}"
              data-manager="${escapeHtml(t.manager)}"
              data-date="${escapeHtml(rowDate)}">Yes</button>

            <button class="btn-no"
              data-index="${index}"
              data-task="${escapeHtml(t.task)}"
              data-manager="${escapeHtml(t.manager)}"
              data-date="${escapeHtml(rowDate)}">No</button>

            ${canAssign ? `<button class="btn-assign" data-index="${index}">Assign</button>` : ''}
            ${assignDropdownHtml}
          </div>`;
      }

      row.innerHTML = `
        <div class="meta">
          <h4>${escapeHtml(t.task)}</h4>
          <p class="manager-name">Manager: ${escapeHtml(t.manager || "N/A")}</p>
          ${metaLines}
        </div>
        ${actionsHtml}
      `;

      taskListEl.appendChild(row);

      if (!isPendingRow && !delegatedTo && (status === 'Yes' || status === 'No')) {
        selectionState.set(index, status);
        const btn = row.querySelector(status === 'Yes' ? '.btn-yes' : '.btn-no');
        if (btn) btn.classList.add('selected');
      }
    });
  }

  // ---------- EVENTS ----------

  taskListEl.addEventListener('click', async (e) => {
    try {
      // Assign Confirm
      const assignConfirm = e.target.closest('.assign-confirm');
      if (assignConfirm) {
        const index = Number(assignConfirm.dataset.index);
        const panel = assignConfirm.closest('.assign-ui');
        const select = panel.querySelector('.assign-select');
        const assignee = select.value;

        if (!assignee) {
          alert('Please select a user.');
          return;
        }

        const t = currentTasks[index];
        const dateForUpdate = t.date || dateInput.value || todayStr;

        if (!confirm(`Assign "${t.task}" to "${assignee}" for ${dateForUpdate}?`)) return;

        try {
          await sendAssignRequest(t.task, t.manager, dateForUpdate, assignee);
          // hide the panel after success
          panel.classList.add('hidden');
          await fetchUserTasks();
        } catch (err) {
          console.error('Assign failed', err);
          alert('Failed to assign task. Please try again.');
        }
        return;
      }

      // Assign cancel
      const assignCancel = e.target.closest('.assign-cancel');
      if (assignCancel) {
        assignCancel.closest('.assign-ui').classList.add('hidden');
        return;
      }

      // Assign open panel
      const assignBtn = e.target.closest('.btn-assign');
      if (assignBtn) {
        const index = Number(assignBtn.dataset.index);
        const row = assignBtn.closest('.task');
        const panel = row.querySelector(`.assign-ui[data-index="${index}"]`);
        panel.classList.toggle('hidden');
        return;
      }

      // Yes / No
      const yesBtn = e.target.closest('.btn-yes');
      const noBtn = e.target.closest('.btn-no');
      if (!yesBtn && !noBtn) return;

      const btn = yesBtn || noBtn;
      const index = Number(btn.dataset.index);
      const task = btn.dataset.task;
      const managerName = btn.dataset.manager;
      const dateForUpdate = btn.dataset.date;

      const newStatus = yesBtn ? 'Yes' : 'No';
      const prevStatus = selectionState.get(index);

      const row = btn.closest('.task');
      row.querySelectorAll('.btn-yes, .btn-no').forEach((b) => b.classList.remove('selected'));

      if (prevStatus === newStatus) {
        selectionState.delete(index);
        sendStatusUpdate(task, managerName, '', dateForUpdate);
        return;
      }

      selectionState.set(index, newStatus);
      btn.classList.add('selected');
      sendStatusUpdate(task, managerName, newStatus, dateForUpdate);

    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    }
  });

  // Leave button
  leaveBtn.addEventListener('click', async () => {
    if (!confirm('Mark all tasks as No for today?')) return;

    const dateStr = dateInput.value || todayStr;

    const payload = { username, manager: '', date: dateStr };

    try {
      await fetch(`${API_BASE_URL}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await fetchUserTasks();
      alert('Leave marked.');
    } catch (err) {
      console.error('Leave failed', err);
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
