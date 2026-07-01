document.addEventListener('DOMContentLoaded', function() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch(...args);
      
      if (response.status === 403) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.blocked || (data.message && data.message.includes('blocked'))) {
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                icon: 'error',
                title: 'Account Blocked',
                text: 'Your account has been blocked. Please contact support.',
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                allowEscapeKey: false
              }).then(() => {
                window.location.href = '/login?error=blocked';
              });
            } else {
              alert('Your account has been blocked. Please contact support.');
              window.location.href = '/login?error=blocked';
            }
            
            return response;
          }
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(...args) {
    this._url = args[1];
    return originalXHROpen.apply(this, args);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this.status === 403) {
        try {
          const data = JSON.parse(this.responseText);
          
          if (data.blocked || (data.message && data.message.includes('blocked'))) {
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                icon: 'error',
                title: 'Account Blocked',
                text: 'Your account has been blocked. Please contact support.',
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                allowEscapeKey: false
              }).then(() => {
                window.location.href = '/login?error=blocked';
              });
            } else {
              alert('Your account has been blocked. Please contact support.');
              window.location.href = '/login?error=blocked';
            }
          }
        } catch (e) {
          
        }
      }
    });
    
    return originalXHRSend.apply(this, args);
  };
});
