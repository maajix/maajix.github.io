// Cookie banner functionality
document.addEventListener('DOMContentLoaded', function() {
  const cookieBanner = document.getElementById('cookie-banner');
  const dismissButton = document.getElementById('dismiss-banner');
  
  // Check if user has already dismissed the banner
  if (getCookie('cookie-banner-dismissed')) {
    cookieBanner.style.display = 'none';
    return;
  }
  
  // Show the cookie banner
  cookieBanner.style.display = 'block';
  
  // Dismiss banner
  dismissButton.addEventListener('click', function() {
    setCookie('cookie-banner-dismissed', 'true', 365);
    cookieBanner.style.display = 'none';
  });
});

// Set a cookie
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}

// Get a cookie value
function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}