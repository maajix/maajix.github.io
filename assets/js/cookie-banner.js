// Cookie banner functionality
document.addEventListener('DOMContentLoaded', function() {
  const cookieBanner = document.getElementById('cookie-banner');
  const acceptButton = document.getElementById('accept-cookies');
  const rejectButton = document.getElementById('reject-cookies');
  
  // Check if user has already made a choice
  if (getCookie('cookie-consent')) {
    cookieBanner.style.display = 'none';
    initializeTracking();
    return;
  }
  
  // Show the cookie banner
  cookieBanner.style.display = 'block';
  
  // Accept cookies
  acceptButton.addEventListener('click', function() {
    setCookie('cookie-consent', 'accepted', 365);
    setCookie('analytics-cookies', 'accepted', 365);
    cookieBanner.style.display = 'none';
    enableTracking();
  });
  
  // Reject cookies
  rejectButton.addEventListener('click', function() {
    setCookie('cookie-consent', 'rejected', 365);
    setCookie('analytics-cookies', 'rejected', 365);
    cookieBanner.style.display = 'none';
    disableTracking();
  });
  
  // Initialize tracking based on existing preferences
  initializeTracking();
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

// Enable tracking (accept)
function enableTracking() {
  updateDatabuddyTracking(true);
}

// Disable tracking (deny)
function disableTracking() {
  updateDatabuddyTracking(false);
}

// Initialize tracking based on cookie preferences
function initializeTracking() {
  const analyticsCookies = getCookie('analytics-cookies');
  
  if (analyticsCookies === 'accepted') {
    enableTracking();
  } else if (analyticsCookies === 'rejected') {
    disableTracking();
  }
}

// Update Databuddy tracking settings
function updateDatabuddyTracking(enableTracking) {
  // Find the Databuddy script
  const script = document.querySelector('script[src="https://cdn.databuddy.cc/databuddy.js"]');
  if (script) {
    // Clear all existing data attributes
    Object.keys(script.dataset).forEach(key => {
      delete script.dataset[key];
    });
    
    // Set common attributes
    script.dataset.clientId = '1DL7tse_ZTnMsjrVbv_Bp';
    script.dataset.enableBatching = 'true';
    script.crossOrigin = 'anonymous';
    
    // Set tracking-specific attributes based on user preference
    if (enableTracking) {
      // When accepted, enable all tracking features
      script.dataset.trackOutgoingLinks = 'true';
      script.dataset.trackInteractions = 'true';
      script.dataset.trackEngagement = 'true';
      script.dataset.trackScrollDepth = 'true';
      script.dataset.trackWebVitals = 'true';
      script.dataset.trackErrors = 'true';
    }
    // When denied, only the common attributes remain (no additional tracking)
  }
}