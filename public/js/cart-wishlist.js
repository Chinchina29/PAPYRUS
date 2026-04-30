function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const CartWishlist = {
  addToCart: async function(productId, quantity = 1) {
    try {
      const response = await fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Added to Cart!', 'Item added successfully');
        this.updateCartCount();
        return true;
      } else {
        if (response.status === 401) {
          this.showLoginRequired();
        } else {
          this.showError(data.message || 'Failed to add item to cart');
        }
        return false;
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      this.showError('Something went wrong. Please try again.');
      return false;
    }
  },

  addToWishlist: async function(productId, buttonElement) {
    try {
      const response = await fetch('/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Added to Wishlist!', 'You can view your wishlist anytime');
        this.updateWishlistCount();
        
        if (buttonElement) {
          const svg = buttonElement.querySelector('svg');
          if (svg) {
            svg.style.fill = '#7A5C3E';
            svg.style.stroke = '#7A5C3E';
          }
          buttonElement.classList.add('in-wishlist');
          buttonElement.setAttribute('data-in-wishlist', 'true');
        }
        
        return true;
      } else {
        if (response.status === 401) {
          this.showLoginRequired();
        } else {
          this.showError(data.message || 'Failed to add to wishlist');
        }
        return false;
      }
    } catch (error) {
      console.error('Add to wishlist error:', error);
      this.showError('Something went wrong. Please try again.');
      return false;
    }
  },

  toggleWishlist: async function(productId, buttonElement) {
    const isInWishlist = buttonElement && buttonElement.getAttribute('data-in-wishlist') === 'true';
    
    if (isInWishlist) {
      return await this.removeFromWishlist(productId, buttonElement);
    } else {
      return await this.addToWishlist(productId, buttonElement);
    }
  },

  removeFromCart: async function(productId) {
    const confirmed = await this.showConfirm('Remove Item?', 'Are you sure you want to remove this item?');
    if (!confirmed) return false;

    try {
      const response = await fetch(`/cart/remove/${productId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Removed!', 'Item removed from cart');
        this.updateCartCount();
        
        const cartCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (cartCard) {
          cartCard.remove();
        }
        
        setTimeout(() => window.location.reload(), 500);
        return true;
      } else {
        this.showError(data.message || 'Failed to remove item');
        return false;
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      this.showError('Something went wrong. Please try again.');
      return false;
    }
  },

  removeFromWishlist: async function(productId, buttonElement) {
    try {
      const response = await fetch(`/wishlist/remove/${productId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Removed!', 'Item removed from wishlist');
        this.updateWishlistCount();
        
        if (buttonElement) {
          const svg = buttonElement.querySelector('svg');
          if (svg) {
            svg.style.fill = 'none';
            svg.style.stroke = '#7A5C3E';
          }
          buttonElement.classList.remove('in-wishlist');
          buttonElement.setAttribute('data-in-wishlist', 'false');
        } else {
          const wishlistCard = document.querySelector(`[data-product-id="${productId}"]`);
          if (wishlistCard) {
            wishlistCard.remove();
          }
        }
        
        return true;
      } else {
        this.showError(data.message || 'Failed to remove item');
        return false;
      }
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      this.showError('Something went wrong. Please try again.');
      return false;
    }
  },

  updateCartQuantity: async function(productId, newQuantity) {
    if (newQuantity < 1) {
      return this.removeFromCart(productId);
    }

    try {
      const response = await fetch(`/cart/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });

      const data = await response.json();

      if (data.success) {
        this.updateCartCount();
        return true;
      } else {
        this.showError(data.message || 'Failed to update quantity');
        return false;
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      this.showError('Something went wrong. Please try again.');
      return false;
    }
  },

  updateCartCount: async function() {
    try {
      const response = await fetch('/cart/count');
      const data = await response.json();
      
      if (data.success) {
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(el => {
          el.textContent = data.count;
          el.style.display = data.count > 0 ? 'flex' : 'none';
        });
      }
    } catch (error) {
      console.error('Update cart count error:', error);
    }
  },

  updateWishlistCount: async function() {
    try {
      const response = await fetch('/wishlist/count');
      const data = await response.json();
      
      if (data.success) {
        const wishlistCountElements = document.querySelectorAll('.wishlist-count');
        wishlistCountElements.forEach(el => {
          el.textContent = data.count;
          el.style.display = data.count > 0 ? 'flex' : 'none';
        });
      }
    } catch (error) {
      console.error('Update wishlist count error:', error);
    }
  },

  checkWishlistStatus: async function(productId) {
    try {
      const response = await fetch(`/wishlist/status/${productId}`);
      const data = await response.json();
      
      if (data.success && data.isInWishlist) {
        const wishlistButtons = document.querySelectorAll(`[data-product-id="${productId}"]`);
        wishlistButtons.forEach(button => {
          const svg = button.querySelector('svg');
          if (svg) {
            svg.style.fill = '#7A5C3E';
            svg.style.stroke = '#7A5C3E';
          }
          button.classList.add('in-wishlist');
          button.setAttribute('data-in-wishlist', 'true');
        });
      }
    } catch (error) {
      console.error('Check wishlist status error:', error);
    }
  },

  checkAllWishlistStatus: async function() {
    try {
      const wishlistButtons = document.querySelectorAll('.wishlist-icon-btn[data-product-id]');
      const productIds = Array.from(wishlistButtons).map(btn => btn.getAttribute('data-product-id'));
      
      if (productIds.length === 0) return;
      
      for (const productId of productIds) {
        await this.checkWishlistStatus(productId);
      }
    } catch (error) {
      console.error('Check all wishlist status error:', error);
    }
  },

  showSuccess: function(title, text) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true
      });
    }
  },

  showError: function(message) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#7A5C3E'
      });
    } else {
      alert(message);
    }
  },

  showLoginRequired: function() {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login to continue',
        confirmButtonColor: '#7A5C3E',
        confirmButtonText: 'Go to Login'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = '/login';
        }
      });
    } else {
      if (confirm('Please login to continue')) {
        window.location.href = '/login';
      }
    }
  },

  showConfirm: async function(title, text) {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7A5C3E',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
      });
      return result.isConfirmed;
    } else {
      return confirm(text);
    }
  }
};

const throttledAddToCart = throttle((productId, quantity) => {
  CartWishlist.addToCart(productId, quantity);
}, 300);

const throttledAddToWishlist = throttle((productId, buttonElement) => {
  CartWishlist.addToWishlist(productId, buttonElement);
}, 300);

const throttledToggleWishlist = throttle((productId, buttonElement) => {
  CartWishlist.toggleWishlist(productId, buttonElement);
}, 300);

const debouncedUpdateQuantity = debounce((productId, quantity) => {
  CartWishlist.updateCartQuantity(productId, quantity);
}, 300);

function addToCart(productId, quantity = 1) {
  throttledAddToCart(productId, quantity);
}

function addToWishlist(productId, event) {
  if (event && event.currentTarget) {
    throttledAddToWishlist(productId, event.currentTarget);
  } else {
    throttledAddToWishlist(productId, null);
  }
}

function toggleWishlist(event, productId) {
  event.preventDefault();
  event.stopPropagation();
  if (event.currentTarget) {
    throttledToggleWishlist(productId, event.currentTarget);
  }
}

function removeFromCart(productId) {
  CartWishlist.removeFromCart(productId);
}

function removeFromWishlist(productId) {
  CartWishlist.removeFromWishlist(productId, null);
}

function updateQuantity(productId, quantity) {
  debouncedUpdateQuantity(productId, quantity);
}

document.addEventListener('DOMContentLoaded', function() {
  CartWishlist.updateCartCount();
  CartWishlist.updateWishlistCount();
  
  const productIdMeta = document.querySelector('meta[name="product-id"]');
  if (productIdMeta) {
    const productId = productIdMeta.content;
    CartWishlist.checkWishlistStatus(productId);
  } else {
    CartWishlist.checkAllWishlistStatus();
  }
});
