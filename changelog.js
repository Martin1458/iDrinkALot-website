const FORMS_ENDPOINT = 'https://000forms.com/f/f_iu2ytaiq';
const signupForm = document.getElementById('signup-form');
const signupMsg = document.getElementById('signup-msg');
signupForm && signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupForm.email.value.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    signupMsg.textContent = 'Enter a valid email.';
    signupMsg.className = 'signup-msg err';
    return;
  }
  signupMsg.textContent = 'Sending…';
  signupMsg.className = 'signup-msg';
  try {
    const res = await fetch(FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, source: 'changelog-page' }).toString(),
    });
    if (!res.ok) throw new Error('Bad response');
    signupMsg.textContent = "You're on the list. We'll be in touch.";
    signupMsg.className = 'signup-msg ok';
    signupForm.reset();
  } catch (err) {
    signupMsg.textContent = 'Something went wrong. Try again.';
    signupMsg.className = 'signup-msg err';
  }
});
