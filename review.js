(function () {
  const form = document.querySelector('.review');
  if (!form) return;
  const platformSelect = form.querySelector('#review-platform');
  const textInput = form.querySelector('#review-text');
  const firstNameInput = form.querySelector('#review-first-name');
  const lastNameInput = form.querySelector('#review-last-name');
  const emailInput = form.querySelector('#review-email');
  const publishInput = form.querySelector('#review-publish');
  const honeypot = form.querySelector('#review-website');
  const button = form.querySelector('.review-btn');
  const msg = form.querySelector('.review-msg');

  // Preselect platform: ?platform= wins, otherwise Android if the user agent says so, else iOS.
  const PLATFORMS = ['ios', 'android'];
  const param = new URLSearchParams(location.search).get('platform');
  const ua = navigator.userAgent || '';
  let platform = 'ios';
  if (PLATFORMS.includes(param)) platform = param;
  else if (/Android/i.test(ua)) platform = 'android';
  platformSelect.value = platform;

  function showMsg(text, kind) {
    msg.textContent = text;
    msg.className = 'review-msg ' + kind;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'review-msg';

    const checked = form.querySelector('input[name="rating"]:checked');
    if (!checked) {
      showMsg('Pick a star rating first.', 'err');
      return;
    }
    const email = (emailInput.value || '').trim();
    if (email && !emailInput.checkValidity()) {
      showMsg("That email doesn't look right.", 'err');
      return;
    }

    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="btn-spinner"></span>';

    try {
      const res = await fetch('https://claude-to-web-815886502786.europe-west1.run.app/api/beta-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: Number(checked.value),
          platform: platformSelect.value,
          text: textInput.value.trim(),
          firstName: firstNameInput.value.trim(),
          lastName: lastNameInput.value.trim(),
          email,
          publishConsent: publishInput.checked,
          website: honeypot.value
        })
      });
      const data = await res.json().catch(() => ({}));

      if (data && data.ok) {
        form.innerHTML =
          '<div class="thanks field" role="status">' +
          '<h2>Thanks, review sent.</h2>' +
          "<p>This is exactly what shapes the next build. Keep an eye on the <a href=\"changelog.html\">changelog</a>.</p>" +
          '</div>';
      } else {
        showMsg('Could not send review. Try again.', 'err');
      }
    } catch (err) {
      showMsg('Network error. Check your connection and retry.', 'err');
    } finally {
      if (button.isConnected) {
        button.innerHTML = originalLabel;
        button.disabled = false;
      }
    }
  });
})();
