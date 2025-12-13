// manager-login.js

// ===== ADMIN ACCOUNT =====
const adminCreds = {
  username: 'ADMIN',
  password: 'admin@123',
  fullname: 'System Admin'
};

// ===== MANAGER ACCOUNTS =====
const managerCreds = [
  { username: 'AMITAVA GHOSH', password: 'amitava123', fullname: 'Amitava Ghosh' },
  { username: 'KAMAL AGARWAL', password: 'kamal741', fullname: 'Kamal Agarwal' },
  { username: 'UMESH AGARWAL', password: 'umesh943', fullname: 'Umesh Agarwal' },
  { username: 'MANI', password: 'mani123', fullname: 'Mani' },
  { username: 'BIDYUT', password: 'bidyut123', fullname: 'Bidyut' },
  { username: 'SAMIR', password: 'samir123', fullname: 'Samir' },
  { username: 'SUBHAJIT', password: 'subha123', fullname: 'Subhajit' },
  { username: 'PRIYAM', password: 'priyam123', fullname: 'Priyam' },
  { username: 'SANTU', password: 'santu123', fullname: 'Santu' },
  { username: 'AMIT', password: 'amit123', fullname: 'AMIT' },
  { username: 'MANOJ', password: 'manoj123', fullname: 'Manoj' },
  { username: 'NITU', password: 'nitu123', fullname: 'Nitu Agarwal' },
  { username: 'ARINDAM', password: 'arindam123', fullname: 'Arindam' },
  { username: 'SOMA', password: 'soma123', fullname: 'Soma' },
  { username: 'NIRAJ', password: 'niraj123', fullname: 'NIRAJ' }
];

const mgrForm = document.getElementById('mgrForm');
const err = document.getElementById('err');

mgrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  err.textContent = '';

  const username = document.getElementById('mgrUser').value.trim();
  const password = document.getElementById('mgrPass').value;

  if (!username || !password) {
    err.textContent = 'Please enter username and password.';
    return;
  }

  // 🔐 ADMIN CHECK FIRST
  if (
    username.toUpperCase() === adminCreds.username &&
    password === adminCreds.password
  ) {
    sessionStorage.clear();
    sessionStorage.setItem('role', 'admin');
    sessionStorage.setItem('fullname', adminCreds.fullname);
    sessionStorage.removeItem('managerViewAs');

    location.href = 'superadmin-dashboard.html';
    return;
  }

  // 🔐 MANAGER LOGIN
  const manager = managerCreds.find(
    m =>
      m.username.toLowerCase() === username.toLowerCase() &&
      m.password === password
  );

  if (!manager) {
    err.textContent = 'Invalid credentials.';
    return;
  }

  sessionStorage.clear();
  sessionStorage.setItem('role', 'manager');
  sessionStorage.setItem('username', manager.username);
  sessionStorage.setItem('fullname', manager.fullname);

  location.href = 'manager-dashboard.html';
});
