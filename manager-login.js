// manager-login.js

// ===== MANAGER ACCOUNTS LIST =====
// Add/remove managers here as needed.
const managerCreds = [
  { username: 'AMITABHA GHOSH', password: 'amitabha123', fullname: 'Amitabha Ghosh' },
  // Example extra:
  // { username: 'RAHUL', password: 'rahul@123', fullname: 'Rahul Sharma' },
];

const mgrForm = document.getElementById('mgrForm');
const err = document.getElementById('err');

mgrForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  err.textContent = '';

  const u = document.getElementById('mgrUser').value.trim();
  const p = document.getElementById('mgrPass').value;

  if (!u || !p) {
    err.textContent = 'Please enter username and password.';
    return;
  }

  // Find matching manager (username case-insensitive, password exact)
  const manager = managerCreds.find(m =>
    m.username.toLowerCase() === u.toLowerCase() && m.password === p
  );

  if (manager) {
    // Save logged-in manager info in sessionStorage
    sessionStorage.setItem('role', 'manager');
    sessionStorage.setItem('username', manager.username);
    sessionStorage.setItem('fullname', manager.fullname);

    // Optional: manager-specific tasks key (if your dashboard needs this)
    // Example key: tasks_manager_SUBHANKAR
    const taskKey = `tasks_manager_${manager.username}`;
    if (!localStorage.getItem(taskKey)) {
      localStorage.setItem(
        taskKey,
        JSON.stringify([
          {
            id: 1,
            title: `Manager (${manager.fullname}): Review team tasks`,
            desc: 'Check pending tasks',
            done: false,
          },
        ])
      );
    }

    // Redirect to manager dashboard
    location.href = 'manager-dashboard.html';
  } else {
    err.textContent = 'Invalid manager credentials.';
  }
});
