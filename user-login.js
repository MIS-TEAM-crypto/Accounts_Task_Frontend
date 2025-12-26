// user-login.js
// Demo users - modify or extend
const demoUsers = [
  { username: 'KOUSHIK PURAKAIT', password: 'K1234', fullName: 'Koushik Purakait' },
  { username: 'SOURAV PAIK', password: 'S1234', fullName: 'Sourav Paik' },
  { username: 'NEHA', password: 'N1234', fullName: 'Neha' },
  { username: 'MEGHNA', password: 'M1234', fullName: 'Meghna' },
  { username: 'POULAMI', password: 'P1234', fullName: 'Poulami' },
  { username: 'SHRIPARNA', password: 'S1234', fullName: 'Shriparna' },
  { username: 'TRISHA', password: 'T1234', fullName: 'Trisha' },
  { username: 'SUNANDA', password: 'S1234', fullName: 'SUNANDA' },
  { username: 'MOUSUMI', password: 'M1234', fullName: 'Mousumi' },
  { username: 'MOUMITA', password: 'M1234', fullName: 'Moumita' },
  { username: 'BINOD', password: 'B1234', fullName: 'Binod Roy' },
  { username: 'KHOKAN', password: 'K1234', fullName: 'Khokan Das' },
  { username: 'MITHUN', password: 'M1234', fullName: 'Mithun Koner' },
  { username: 'AMIT KUMAR', password: 'A1234', fullName: 'Amit Kumar Dana' },
  { username: 'ARINDAM', password: 'A1234', fullName: 'Arindam Dalal' },
  { username: 'BIJOY', password: 'B1234', fullName: 'Bijoy Mondal' },
  { username: 'KOUSIK DUTTA', password: 'K1234', fullName: 'Kousik Dutta' },
  { username: 'MANOJ', password: 'M1234', fullName: 'Manoj' },
  { username: 'KOUSHIK DOLUI', password: 'K1234', fullName: 'Koushik Dolui' },
  { username: 'SUBHADIP', password: 'S1234', fullName: 'Subhadip Ghosh' },
  { username: 'DINESH', password: 'D1234', fullName: 'Dinesh Sahana' },
  { username: 'RISHI', password: 'R1234', fullName: 'Rishi Gupta' },
  { username: 'KANCHAN', password: 'K1234', fullName: 'Kanchan Kumar Saha' },
  { username: 'DEBASISH', password: 'D1234', fullName: 'Debasish Shyam' },
  { username: 'ARUP', password: 'A1234', fullName: 'Arup Bhattarcharya' },
  { username: 'PRADIP', password: 'P1234', fullName: 'Pradip Das' },
  { username: 'SAMIRON', password: 'S1234', fullName: 'Samiron Mondal' },
  { username: 'SAMIR', password: 'S1234', fullName: 'Samir Majhi' },
  { username: 'SRIKANTA DAS', password: 'S1234', fullName: 'Srikanta Das' },
  { username: 'SREEKANTA', password: 'S1234', fullName: 'Sreekanta Prodhan' }
  
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
