/**
 * Hamburger Menu Module
 * Handles mobile navigation menu toggle functionality
 * Dependencies: None (vanilla JavaScript)
 */

const HamburgerMenu = (() => {
  // Private state
  let state = {
    isOpen: false,
    isAnimating: false,
    focusedElementBeforeOpen: null
  };

  // DOM element references
  let elements = {
    body: null,
    hamburgerBtn: null,
    mobileNav: null,
    navLinks: null,
    overlay: null
  };

  /**
   * Cache DOM elements
   */
  const cacheElements = () => {
    elements.body = document.body;
    elements.hamburgerBtn = document.querySelector('.hamburger-btn');
    elements.mobileNav = document.querySelector('.nav-mobile');
    
    if (!elements.hamburgerBtn || !elements.mobileNav) {
      console.warn('Hamburger menu elements not found');
      return false;
    }
    
    elements.navLinks = elements.mobileNav.querySelectorAll('a');
    
    // Create overlay if it doesn't exist
    if (!document.querySelector('.menu-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'menu-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }
    elements.overlay = document.querySelector('.menu-overlay');
    
    return true;
  };

  /**
   * Open the mobile menu
   */
  const openMenu = () => {
    if (state.isAnimating || state.isOpen) return;
    
    state.isAnimating = true;
    state.focusedElementBeforeOpen = document.activeElement;
    
    // Update DOM
    elements.body.classList.add('menu-open');
    elements.hamburgerBtn.setAttribute('aria-expanded', 'true');
    elements.mobileNav.setAttribute('aria-hidden', 'false');
    
    // Focus first nav link after animation
    setTimeout(() => {
      if (elements.navLinks && elements.navLinks.length > 0) {
        elements.navLinks[0].focus();
      }
      state.isAnimating = false;
      state.isOpen = true;
    }, 300);
  };

  /**
   * Close the mobile menu
   */
  const closeMenu = () => {
    if (state.isAnimating || !state.isOpen) return;
    
    state.isAnimating = true;
    
    // Update DOM
    elements.body.classList.remove('menu-open');
    elements.hamburgerBtn.setAttribute('aria-expanded', 'false');
    elements.mobileNav.setAttribute('aria-hidden', 'true');
    
    // Restore focus after animation
    setTimeout(() => {
      if (state.focusedElementBeforeOpen) {
        state.focusedElementBeforeOpen.focus();
      }
      state.isAnimating = false;
      state.isOpen = false;
    }, 300);
  };

  /**
   * Toggle menu open/close
   */
  const toggleMenu = () => {
    try {
      if (state.isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    } catch (error) {
      console.error('Menu toggle failed:', error);
      // Attempt to restore clean state
      state.isOpen = false;
      elements.body?.classList.remove('menu-open');
    }
  };

  /**
   * Handle keyboard events
   */
  const handleKeyboard = (event) => {
    // Escape key closes menu
    if (event.key === 'Escape' && state.isOpen) {
      closeMenu();
      return;
    }
    
    // Enter/Space on hamburger button toggles menu
    if (event.target === elements.hamburgerBtn) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMenu();
      }
    }
    
    // Tab key handling for focus trap
    if (event.key === 'Tab' && state.isOpen) {
      trapFocus(event);
    }
  };

  /**
   * Trap focus within mobile menu
   */
  const trapFocus = (event) => {
    if (!state.isOpen) return;
    
    const focusableElements = elements.mobileNav.querySelectorAll(
      'a[href], button:not([disabled])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Tab forward from last element - wrap to first
    if (event.key === 'Tab' && !event.shiftKey && event.target === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
    
    // Tab backward from first element - wrap to last
    if (event.key === 'Tab' && event.shiftKey && event.target === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  };

  /**
   * Handle nav link clicks
   */
  const handleNavLinkClick = () => {
    // Close menu when a nav link is clicked
    closeMenu();
  };

  /**
   * Handle window resize
   */
  let resizeTimer;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Close menu if viewport exceeds mobile breakpoint
      if (window.innerWidth >= 1024 && state.isOpen) {
        closeMenu();
      }
    }, 250);
  };

  /**
   * Attach event listeners
   */
  const attachEventListeners = () => {
    // Hamburger button click
    elements.hamburgerBtn.addEventListener('click', toggleMenu);
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyboard);
    
    // Nav link clicks
    elements.navLinks.forEach(link => {
      link.addEventListener('click', handleNavLinkClick);
    });
    
    // Overlay click to close
    if (elements.overlay) {
      elements.overlay.addEventListener('click', closeMenu);
    }
    
    // Window resize
    window.addEventListener('resize', handleResize);
  };

  /**
   * Remove event listeners
   */
  const removeEventListeners = () => {
    if (elements.hamburgerBtn) {
      elements.hamburgerBtn.removeEventListener('click', toggleMenu);
    }
    
    document.removeEventListener('keydown', handleKeyboard);
    
    if (elements.navLinks) {
      elements.navLinks.forEach(link => {
        link.removeEventListener('click', handleNavLinkClick);
      });
    }
    
    if (elements.overlay) {
      elements.overlay.removeEventListener('click', closeMenu);
    }
    
    window.removeEventListener('resize', handleResize);
  };

  /**
   * Initialize the module
   */
  const init = () => {
    try {
      if (!cacheElements()) {
        return;
      }
      
      attachEventListeners();
      
      // Set initial ARIA attributes
      elements.hamburgerBtn.setAttribute('aria-expanded', 'false');
      elements.hamburgerBtn.setAttribute('aria-label', 'Toggle navigation menu');
      elements.hamburgerBtn.setAttribute('aria-controls', 'mobile-nav');
      
      elements.mobileNav.setAttribute('id', 'mobile-nav');
      elements.mobileNav.setAttribute('aria-hidden', 'true');
      elements.mobileNav.setAttribute('aria-label', 'Mobile navigation');
      
      console.log('Hamburger menu initialized');
    } catch (error) {
      console.error('Hamburger menu initialization failed:', error);
    }
  };

  /**
   * Destroy the module
   */
  const destroy = () => {
    removeEventListeners();
    
    if (state.isOpen) {
      closeMenu();
    }
    
    // Reset state
    state = {
      isOpen: false,
      isAnimating: false,
      focusedElementBeforeOpen: null
    };
    
    console.log('Hamburger menu destroyed');
  };

  // Public API
  return {
    init,
    open: openMenu,
    close: closeMenu,
    toggle: toggleMenu,
    destroy
  };
})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', HamburgerMenu.init);
} else {
  HamburgerMenu.init();
}
