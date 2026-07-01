

const FormValidator = {
  
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[6-9]\d{9}$/,
    name: /^[a-zA-Z\s]{2,50}$/,
    password: {
      minLength: 8,
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /[0-9]/,
      special: /[!@#$%^&*(),.?":{}|<>]/,
    },
    postalCode: /^\d{6}$/,
    referralCode: /^[A-Z0-9]{6,12}$/,
  },

  rules: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s]+$/,
      patternMessage: "First name can only contain letters and spaces",
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s]+$/,
      patternMessage: "Last name can only contain letters and spaces",
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: "Please enter a valid email address",
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 128,
      custom: (value) => {
        const requirements = {
          uppercase: /[A-Z]/.test(value),
          lowercase: /[a-z]/.test(value),
          number: /[0-9]/.test(value),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
        };
        
        if (!requirements.uppercase || !requirements.lowercase || 
            !requirements.number || !requirements.special) {
          return "Password must contain uppercase, lowercase, number, and special character";
        }
        return null;
      },
    },
    confirmPassword: {
      required: true,
      custom: (value, formData) => {
        if (value !== formData.password) {
          return "Passwords do not match";
        }
        return null;
      },
    },
    phone: {
      required: false,
      pattern: /^[6-9]\d{9}$/,
      patternMessage: "Please enter a valid 10-digit Indian phone number",
    },
    postalCode: {
      required: true,
      pattern: /^\d{6}$/,
      patternMessage: "Postal code must be 6 digits",
    },
    referralCode: {
      required: false,
      pattern: /^[A-Z0-9]{6,12}$/,
      patternMessage: "Invalid referral code format",
    },
  },

  validateForm: function(formElement, customRules = {}) {
    const formData = new FormData(formElement);
    const data = {};
    const errors = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    }
    
    const rulesToApply = { ...this.rules, ...customRules };
    
    for (let fieldName in rulesToApply) {
      const fieldRules = rulesToApply[fieldName];
      const value = data[fieldName];
      const fieldError = this.validateField(fieldName, value, fieldRules, data);
      
      if (!fieldError.isValid) {
        errors[fieldName] = fieldError.errors[0];
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data,
    };
  },

  setupFormValidation: function(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) return;
    
    form.setAttribute('novalidate', '');
    
    const {
      onSubmit,
      customRules = {},
      realTimeValidation = true,
    } = options;
    
    if (realTimeValidation) {
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          const fieldName = input.name || input.id;
          const rulesToApply = { ...this.rules, ...customRules };
          
          if (rulesToApply[fieldName]) {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
              data[key] = typeof value === 'string' ? value.trim() : value;
            }
            
            const value = input.value.trim();
            const result = this.validateField(fieldName, value, rulesToApply[fieldName], data);
            
            if (!result.isValid) {
              this.highlightField(input, result.errors[0]);
            } else {
              this.clearFieldError(input);
            }
          }
        });
        
        if (input.name === 'password' || input.id === 'password') {
          input.addEventListener('input', () => {
            const fieldName = input.name || input.id;
            const rulesToApply = { ...this.rules, ...customRules };
            
            if (rulesToApply[fieldName]) {
              const formData = new FormData(form);
              const data = {};
              for (let [key, value] of formData.entries()) {
                data[key] = typeof value === 'string' ? value.trim() : value;
              }
              
              const value = input.value;
              const result = this.validateField(fieldName, value, rulesToApply[fieldName], data);
              
              if (!result.isValid) {
                this.highlightField(input, result.errors[0]);
              } else {
                this.clearFieldError(input);
              }
            }
          });
        }
      });
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const validation = this.validateForm(form, customRules);
      
      if (!validation.isValid) {
        const firstError = Object.keys(validation.errors)[0];
        const firstErrorMessage = validation.errors[firstError];
        
        const fieldElement = form.querySelector(`[name="${firstError}"], #${firstError}`);
        if (fieldElement) {
          this.highlightField(fieldElement, firstErrorMessage);
          fieldElement.focus();
        }
        
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            html: this.formatMultipleErrors(validation.errors),
            confirmButtonColor: '#7A5C3E',
          });
        }
        
        return;
      }
      
      if (onSubmit) {
        await onSubmit(validation.data, form);
      }
    });
  },

  formatMultipleErrors: function(errors) {
    const errorList = Object.entries(errors)
      .map(([field, message]) => {
        const label = this.getFieldLabel(field);
        return `<div style="text-align: left; margin: 5px 0;"><strong>${label}:</strong> ${message}</div>`;
      })
      .join('');
    
    return `<div style="max-height: 300px; overflow-y: auto;">${errorList}</div>`;
  },
  
  showFieldError: function(message, field = null, errorType = null) {
    this.clearFieldErrors();
    
    let title = 'Validation Error';
    let icon = 'error';
    
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

    if (field) {
      this.highlightField(field, message);
    }

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

  highlightField: function(field, message) {
    const fieldElement = typeof field === 'string' ? this.findFieldElement(field) : field;
    
    if (fieldElement) {
      fieldElement.style.borderColor = '#ff6b6b';
      fieldElement.style.boxShadow = '0 0 5px rgba(255, 107, 107, 0.3)';
      fieldElement.classList.add('field-error');
      
      fieldElement.focus();
      
      this.addFieldErrorMessage(fieldElement, message);
      
      fieldElement.addEventListener('input', () => this.clearFieldError(fieldElement), { once: true });
      fieldElement.addEventListener('focus', () => this.clearFieldError(fieldElement), { once: true });
    }
  },

  findFieldElement: function(field) {
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

  addFieldErrorMessage: function(fieldElement, message) {
    const existingError = fieldElement.parentNode.querySelector('.field-error-message');
    if (existingError) {
      existingError.textContent = message;
      return;
    }
    
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
    
    fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
  },

  clearFieldError: function(fieldElement) {
    if (!fieldElement) return;
    
    fieldElement.style.borderColor = '';
    fieldElement.style.boxShadow = '';
    fieldElement.classList.remove('field-error');
    
    const errorMessage = fieldElement.parentNode.querySelector('.field-error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  },

  clearFieldErrors: function() {
    const errorFields = document.querySelectorAll('.field-error');
    errorFields.forEach(field => this.clearFieldError(field));
    
    const errorMessages = document.querySelectorAll('.field-error-message');
    errorMessages.forEach(message => message.remove());
  },

  formatErrorMessage: function(message, field) {
    if (!field) return message;
    
    const fieldLabel = typeof field === 'string' ? this.getFieldLabel(field) : field.name || field.id;
    
    return `
      <div style="text-align: left;">
        <p><strong>Field:</strong> ${this.getFieldLabel(fieldLabel)}</p>
        <p><strong>Issue:</strong> ${message}</p>
      </div>
    `;
  },

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
      this.showFieldError('Network error. Please check your connection and try again.');
    }
  },

  validateField: function(field, value, rules, formData = {}) {
    const errors = [];
    
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${this.getFieldLabel(field)} is required`);
      return { isValid: false, errors, field };
    }
    
    if (!value || value.toString().trim() === '') {
      return { isValid: true, errors: [], field };
    }
    
    if (rules.minLength && value.toString().length < rules.minLength) {
      errors.push(`${this.getFieldLabel(field)} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.toString().length > rules.maxLength) {
      errors.push(`${this.getFieldLabel(field)} must not exceed ${rules.maxLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.patternMessage || `${this.getFieldLabel(field)} format is invalid`);
    }
    
    if (rules.match && value !== rules.match) {
      errors.push(`${this.getFieldLabel(field)} does not match`);
    }
    
    if (rules.custom) {
      const customError = rules.custom(value, formData);
      if (customError) {
        errors.push(customError);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      field: field
    };
  },

  getFieldLabel: function(field) {
    const labels = {
      'email': 'Email Address',
      'password': 'Password',
      'confirmPassword': 'Confirm Password',
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'phone': 'Phone Number',
      'quantity': 'Quantity',
      'code': 'Coupon Code',
      'addressLine1': 'Address Line 1',
      'addressLine2': 'Address Line 2',
      'city': 'City',
      'state': 'State',
      'postalCode': 'Postal Code',
      'landmark': 'Landmark',
      'referralCode': 'Referral Code',
    };
    
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
  }
};

window.FormValidator = FormValidator;

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