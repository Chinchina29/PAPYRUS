# Project Structure

The project has been reorganized into a clean, modular structure separating user and admin functionality:

## Directory Structure

```
src/
├── user/                           # User-specific functionality
│   ├── controllers/               # User controllers
│   │   ├── auth.controller.js
│   │   ├── profile.controller.js
│   │   ├── address.controller.js
│   │   ├── password.controller.js
│   │   ├── oauth.controller.js
│   │   ├── product.controller.js
│   │   └── seller.controller.js
│   ├── routes/                    # User routes
│   │   ├── auth.routes.js
│   │   └── profile.routes.js
│   ├── services/                  # User-specific services
│   │   ├── auth.service.js
│   │   └── address.service.js
│   └── middleware/                # User middleware
│       └── auth.middleware.js
│
├── admin/                         # Admin-specific functionality
│   ├── controllers/               # Admin controllers
│   │   ├── admin.controller.js
│   │   ├── category.controller.js
│   │   ├── product.controller.js
│   │   └── submission.controller.js
│   ├── routes/                    # Admin routes
│   │   └── admin.routes.js
│   ├── services/                  # Admin-specific services
│   │   ├── category.service.js
│   │   └── sellarSubmission.services.js
│   └── middleware/                # Admin middleware
│       └── admin.middleware.js
│
└── shared/                        # Shared functionality
    ├── models/                    # Database models
    │   ├── User.js
    │   ├── Address.js
    │   └── Category.js
    ├── config/                    # Configuration files
    │   ├── mongo.config.js
    │   ├── session.config.js
    │   ├── cloudinary.config.js
    │   ├── passport.config.js
    │   └── email.config.js
    ├── services/                  # Shared services
    │   ├── user.service.js
    │   ├── email.service.js
    │   ├── otp.service.js
    │   └── product.service.js
    ├── middleware/                # Shared middleware
    │   ├── cache.middleware.js
    │   └── validation.middleware.js
    ├── helpers/                   # Helper functions
    │   └── response.helper.js
    └── controllers/               # Shared controllers
        └── error.controller.js
```

## Key Features

### Category System
- **Two-Level Structure**: Only **Category** and **Subcategory** levels
- **Admin-Managed**: No predefined categories - admin creates everything
- **Duplicate Names Allowed**: Multiple categories can have the same name
- **Simple Assignment**: Each book has exactly one category and optionally one subcategory
- **Flexible Structure**: 
  - **Main Categories**: Top-level categories (e.g., Fiction, Non-Fiction, Science)
  - **Subcategories**: Under main categories (e.g., Science Fiction under Fiction)
- **No Uniqueness Constraints**: Same category names can exist multiple times
- **Book Assignment**: Each product is assigned to exactly one category and one subcategory

### Product System
- **Complete Product Management**: Full CRUD operations for products through admin panel
- **Rich Product Data**: Title, author, description, price, condition, stock, ISBN, publisher, etc.
- **Image Management**: Multiple images per product with Cloudinary integration
- **Category Integration**: Products linked to the flexible category system
- **Advanced Filtering**: Search, category, condition, price range, and sorting options
- **Product Detail Pages**: Comprehensive product information with image gallery
- **Related Products**: Shows similar products from the same category
- **Stock Management**: Real-time stock tracking and availability display
- **Responsive Design**: Mobile-friendly product listings and detail pages

### Input Validation
- All forms have maxlength attributes
- Server-side validation with proper limits
- Email: 100 characters
- Names: 50 characters
- Passwords: 128 characters
- Phone: 15 characters
- Bio: 500 characters

### Session Management
- Separate sessions for users and admins
- Automatic timeout handling
- Secure cookie configuration
- Session activity tracking

## Setup Instructions

1. **Create Admin User** (one-time setup):
   ```bash
   node scripts/create-admin.js
   ```
   Default credentials: admin@papyrus.com / Admin123!

2. **Verify Admin Setup** (optional):
   ```bash
   node scripts/check-admin.js
   ```

## Normal Operation

**No scripts needed for daily use!** The system works entirely through the web interface:

1. **Admin Login**: Visit `/admin/signin` with admin credentials
2. **Create Categories**: Use admin panel to create main categories and subcategories
3. **Add Products**: Create products through admin interface
4. **Manage Everything**: All management is done through the web UI

## Why Scripts Exist

- **create-admin.js**: One-time setup to create the first admin user
- **check-admin.js**: Troubleshooting tool to verify admin user exists

**Everything else is managed through the admin web interface - no scripts required!**

## Admin Login Issue Resolution

If you're having trouble logging in as admin:

1. Run the admin creation script
2. Check the console logs for debugging information
3. Verify the admin user exists in the database
4. Ensure the password is correct

The admin controller now includes detailed logging to help debug login issues.