// admin-login.js
const adminCred = { username: 'admin', password: 'Admin@45971', fullname: 'Administrator' };
const admForm = document.getElementById('admForm');
const errA = document.getElementById('err');

admForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  errA.textContent = '';
  const u = document.getElementById('admUser').value.trim();
  const p = document.getElementById('admPass').value;
  if (u === adminCred.username && p === adminCred.password) {
    sessionStorage.setItem('role', 'admin');
    sessionStorage.setItem('username', adminCred.username);
    sessionStorage.setItem('fullname', adminCred.fullname);
    // initialize admin data
    if (!localStorage.getItem('tasks_admin')) {
      localStorage.setItem('tasks_admin', JSON.stringify([
        { id: 1, title: 'Admin: Check system', desc: 'System health checks', done:false }
      ]));
    }
    location.href = 'admin-dashboard.html';
  } else {
    errA.textContent = 'Invalid admin credentials.';
  }
});
