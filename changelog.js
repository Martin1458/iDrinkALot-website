document.querySelector('.signup').addEventListener('submit', function () {
  const btn = this.querySelector('.signup-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>';
});
