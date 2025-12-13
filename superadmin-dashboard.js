// superadmin-dashboard.js

const managers = [
  'Amitava Ghosh',
  'Kamal Agarwal',
  'Umesh Agarwal',
  'Mani',
  'Bidyut',
  'Samir',
  'Subhajit',
  'Priyam',
  'Santu',
  'AMIT',
  'Manoj',
  'Nitu Agarwal',
  'Arindam',
  'Soma',
  'NIRAJ'
];

(() => {
  if (sessionStorage.getItem('role') !== 'admin') {
    sessionStorage.clear();
    location.href = 'manager-login.html';
    return;
  }

  const select = document.getElementById('managerSelect');

  managers.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });

  document.getElementById('viewBtn').onclick = () => {
    const manager = select.value;
    if (!manager) return alert('Select a manager');

    sessionStorage.setItem('managerViewAs', manager);
    sessionStorage.setItem('role', 'manager');
    sessionStorage.setItem('fullname', manager);

    location.href = 'manager-dashboard.html';
  };

  document.getElementById('logoutBtn').onclick = () => {
    sessionStorage.clear();
    location.href = 'index.html';
  };
})();
