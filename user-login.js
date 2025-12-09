// user-login.js
// Demo users - modify or extend
const demoUsers = [
  { username: 'KOUSHIK PURAKAIT', password: 'K1234', fullName: 'Koushik Purakait' },
  { username: 'SOURAV PAIK', password: 'S1234', fullName: 'Sourav Paik' }
];

const loginForm = document.getElementById('loginForm');
const errDiv = document.getElementById('err');

loginForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  errDiv.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const user = demoUsers.find(u => u.username === username && u.password === password);
  if (!user) {
    errDiv.textContent = 'Invalid username or password.';
    return;
  }

  // Save session (client-side)
  sessionStorage.setItem('role', 'user');
  sessionStorage.setItem('username', user.username);
  sessionStorage.setItem('fullname', user.fullName);

  // optional: ensure user tasks exist in localStorage
  const key = `tasks_user_${user.username}`;
  if (!localStorage.getItem(key)) {
    const starter = [
      { id: 1, title: 'Welcome task', desc: 'This is your first task', done: false }
    ];
    localStorage.setItem(key, JSON.stringify(starter));
  }

  // redirect to user's dashboard
  window.location.href = `user-dashboard.html?u=${encodeURIComponent(user.username)}`;
});
