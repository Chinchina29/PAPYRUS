

const FormValidator = {
  
  showFieldError: function(message, field = null, errorType = null) {
    this.clearFieldErrors();
    
    let title = 'Validation Error';
    let icon = 'error';
    
    // Categorize error types for better user experience
    if (errorType) {
      switch (errorType) {
        case 'MISSING_PRODUCT_ID':
        case 'MISSING_QUANTITY':
        case 'MISSING_COUPON_CODE':
          title = 'Required Field Missing';
          icon = 'warning';
          break;
        case 'INVALID_QUANTITY_FORMAT':
        case 'INVALID_QUANTITY_MINIMUM':
        case 'INVALID_QUANTITY_DECIMAL':
          title = 'Invalid Quantity';
          icon = 'warning';
          break;
        case 'INVALID_EMAIL':
        case 'INVALID_PASSWORD':
          title = 'Invalid Input Format';
          icon = 'warning';
          break;
        case 'PASSWORD_MISMATCH':
          title = 'Password Confirmation Error';
          icon = 'warning';
          break;
        case 'OUT_OF_STOCK':
        case 'INSUFFICIENT_STOCK':
          title = 'Stock Issue';
          icon = 'info';
          break;
        case 'PRODUCT_NOT_AVAILABLE':
        case 'PRODUCT_NOT_FOUND':
          title = 'Product Unavailable';
          icon = 'warning';
          break;
        case 'INVALID_COUPON':
        case 'EXPIRED_COUPON':
          title = 'Coupon Issue';
          icon = 'warning';
          break;
      }
    }

    // Highlight the problematic field
    if (field) {
      this.highlightField(field, message);
    }

    // Show the error notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: icon,
        title: title,
        html: this.formatErrorMessage(message, field),
        confirmButtonColor: '#7A5C3E',
        customClass: {
          popup: 'field-error-popup'
        },
        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        }
      });
    } else {
      alert(`${title}: ${message}`);
    }
  },

  /**
   * Highlight a specific form field with error styling
   * @param {string} field - Field name to highlight
   * @param {string} message - Error message to show
   */
  highlightField: function(field, message) {
    const fieldElement = this.findFieldElement(field);
    
    if (fieldElement) {
      // Add error styling
      fieldElement.style.borderColor = '#ff6b6b';
      fieldElement.style.boxShadow = '0 0 5px rgba(255, 107, 107, 0.3)';
      fieldElement.classList.add('field-error');
      
      // Focus the field
      fieldElement.focus();
      
      // Add error message below the field
      this.addFieldErrorMessage(fieldElement, message);
      
      // Remove error styling after user starts typing
      fieldElement.addEventListener('input', this.clearFieldError.bind(this, fieldElement), { once: true });
      fieldElement.addEventListener('focus', this.clearFieldError.bind(this, fieldElement), { once: true });
    }
  },

  /**
   * Find the form field element by various selectors
   * @param {string} field - Field name to find
   * @returns {HTMLElement|null} - Found field element
   */
  findFieldElement: function(field) {
    // Try multiple selectors to find the field
    const selectors = [
      `[name="${field}"]`,
      `#${field}`,
      `.${field}-input`,
      `[data-field="${field}"]`,
      `input[placeholder*="${field}"]`
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return null;
  },

  /**
   * Add error message below the field
   * @param {HTMLElement} fieldElement - Field element
   * @param {string} message - Error message
   */
  addFieldErrorMessage: function(fieldElement, message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error-message';
    errorElement.textContent = message;
    errorElement.style.cssText = `
      color: #ff6b6b;
      font-size: 12px;
      margin-top: 4px;
      padding: 4px 8px;
      background-color: #ffe6e6;
      border-radius: 4px;
      border: 1px solid #ffcccc;
      animation: fadeIn 0.3s ease-in-out;
    `;
    
    // Insert after the field
    fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
  },

  /**
   * Clear error styling from a specific field
   * @param {HTMLElement} fieldElement - Field element to clear
   */
  clearFieldError: function(fieldElement) {
    fieldElement.style.borderColor = '';
    fieldElement.style.boxShadow = '';
    fieldElement.classList.remove('field-error');
    
    // Remove error message
    const errorMessage = fieldElement.parentNode.querySelector('.field-error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  },

  /**
   * Clear all field errors
   */
  clearFieldErrors: function() {
    const errorFields = document.querySelectorAll('.field-error');
    errorFields.forEach(field => this.clearFieldError(field));
    
    const errorMessages = document.querySelectorAll('.field-error-message');
    errorMessages.forEach(message => message.remove());
  },

  /**
   * Format error message with field information
   * @param {string} message - Original message
   * @param {string} field - Field name
   * @returns {string} - Formatted HTML message
   */
  formatErrorMessage: function(message, field) {
    if (!field) return message;
    
    const fieldLabels = {
      'email': 'Email Address',
      'password': 'Password',
      'confirmPassword': 'Confirm Password',
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'phone': 'Phone Number',
      'quantity': 'Quantity',
      'productId': 'Product Selection',
      'code': 'Coupon Code',
      'addressLine1': 'Address',
      'city': 'City',
      'state': 'State',
      'postalCode': 'Postal Code'
    };
    
    const fieldLabel = fieldLabels[field] || field;
    
    return `
      <div style="text-align: left;">
        <p><strong>Field:</strong> ${fieldLabel}</p>
        <p><strong>Issue:</strong> ${message}</p>
      </div>
    `;
  },

  /**
   * Handle form submission with enhanced validation
   * @param {HTMLFormElement} form - Form element
   * @param {string} url - Submission URL
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   */
  submitForm: async function(form, url, onSuccess = null, onError = null) {
    this.clearFieldErrors();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result);
        } else if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      } else {
        if (result.fieldErrors) {
          // Handle multiple field errors
          Object.keys(result.fieldErrors).forEach(field => {
            this.highlightField(field, result.fieldErrors[field]);
          });
        }
        
        this.showFieldError(
          result.message || 'Validation failed',
          result.failedField,
          result.errorType
        );
        
        if (onError) {
          onError(result);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showFieldError('Network error. Please check your connection and try again.');
    }
  },

  /**
   * Validate individual field in real-time
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Object} rules - Validation rules
   * @returns {Object} - Validation result
   */
  validateField: function(field, value, rules) {
    const errors = [];
    
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${this.getFieldLabel(field)} is required`);
    }
    
    if (value && rules.minLength && value.toString().length < rules.minLength) {
      errors.push(`${this.getFieldLabel(field)} must be at least ${rules.minLength} characters`);
    }
    
    if (value && rules.maxLength && value.toString().length > rules.maxLength) {
      errors.push(`${this.getFieldLabel(field)} must not exceed ${rules.maxLength} characters`);
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.patternMessage || `${this.getFieldLabel(field)} format is invalid`);
    }
    
    if (value && rules.match && value !== rules.match) {
      errors.push(`${this.getFieldLabel(field)} does not match`);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      field: field
    };
  },

  /**
   * Get user-friendly field label
   * @param {string} field - Field name
   * @returns {string} - Field label
   */
  getFieldLabel: function(field) {
    const labels = {
      'email': 'Email Address',
      'password': 'Password',
      'confirmPassword': 'Confirm Password',
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'phone': 'Phone Number',
      'quantity': 'Quantity',
      'code': 'Coupon Code'
    };
    
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }
};

// Make FormValidator available globally
window.FormValidator = FormValidator;

// Add CSS for animations and error styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .field-error {
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  
  .field-error-popup {
    border-left: 4px solid #ff6b6b !important;
  }
`;
document.head.appendChild(style);