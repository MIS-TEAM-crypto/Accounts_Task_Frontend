// index.js - simple navigation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const target = btn.dataset.target;
  if (target) window.location.href = target;
});
