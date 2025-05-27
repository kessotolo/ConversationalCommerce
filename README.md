# Conversational Commerce Platform

A high-growth commerce platform for African markets that seamlessly integrates mobile-first storefronts with WhatsApp messaging capabilities. Built for scale with security and performance in mind.

## 🌟 Key Features

- **Seller Authentication**: Secure JWT-based authentication through Clerk with role-based access control
- **Product Management**: Full CRUD operations with rich media support and mobile camera integration
- **WhatsApp Integration**: Direct customer engagement through conversational commerce
- **Mobile-First Design**: Optimized interface with bottom navigation for primary devices used in African markets
- **Multi-Media Support**: Images, video, and WhatsApp status content handling with direct camera capture
- **Advanced Security**: Comprehensive audit logging, request monitoring, optimistic locking, and PostgreSQL Row-Level Security (RLS) for tenant isolation
- **High Performance**: Efficient keyset pagination, database indexing, and batch operations
- **Robust Error Handling**: Standardized error responses and centralized exception management

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python framework
- **PostgreSQL**: Reliable relational database
- **SQLAlchemy**: ORM for database interactions
- **Cloudinary**: Media storage and transformation
- **Twilio**: WhatsApp messaging integration

### Frontend
- **Next.js**: React framework with SSR capabilities
- **TailwindCSS**: Utility-first CSS for rapid UI development
- **TypeScript**: Type-safe JavaScript
- **Clerk**: Authentication and user management
- **Chart.js**: Data visualization for analytics
- **Lucide React**: Icon library for consistent UI

## 📱 Mobile-First Architecture

The platform is designed with a mobile-first approach, recognizing that most users in African markets primarily access the internet via mobile devices:

- **Bottom Tab Navigation**: User-friendly mobile navigation with quick access to key features
- **Mobile Camera Integration**: Direct product photo capture from mobile devices
- **Responsive Dashboard**: Optimized for all screen sizes with special attention to mobile usability
- **Touch-Friendly UI**: Larger touch targets and intuitive gestures for mobile users
- **Offline Capabilities**: Core functionality works with intermittent connectivity
- **WhatsApp-Centric**: Deep integration with the most popular messaging platform in target markets

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.10+
- PostgreSQL database
- Clerk account (authentication)
- Cloudinary account (media storage)
- Twilio account (WhatsApp messaging)

### Installation

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Edit .env.local with your configuration values
# Required: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# Start development server
npm run dev
```

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Edit .env with your configuration values
# Required: DATABASE_URL, CLOUDINARY_URL, TWILIO_AUTH_TOKEN

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
JWT_SECRET=your_jwt_secret
```

## 📁 Project Structure

### Frontend Structure

```
frontend/
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Authentication routes
│   │   ├── dashboard/    # Dashboard routes
│   │   │   ├── products/ # Product management
│   │   │   ├── orders/   # Order management
│   │   │   ├── messages/ # WhatsApp messaging
│   │   │   └── settings/ # Store settings
│   │   └── storefront/   # Customer-facing storefront
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── layout/       # Layout components (Sidebar, MobileNav)
│   │   └── ui/           # Base UI components
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript types
├── next.config.js        # Next.js configuration
└── tailwind.config.js    # TailwindCSS configuration
```

### Backend Structure

```
backend/
├── alembic/             # Database migrations
├── app/
│   ├── api/             # API endpoints
│   │   ├── v1/          # API version 1
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── messages/
│   │   │   └── users/
│   ├── core/            # Core functionality
│   │   ├── auth/        # Authentication
│   │   ├── config/      # Configuration
│   │   ├── db/          # Database
│   │   ├── errors/      # Error handling
│   │   └── utils/       # Utilities
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   └── services/        # Business logic
├── tests/               # Test suite
└── main.py              # Application entry point
```

## 🔄 Recent Updates

### Multi-Tenant Architecture Implementation (May 2025)

- **PostgreSQL Row-Level Security**: Implemented database-level tenant isolation using PostgreSQL RLS
- **Tenant Context Middleware**: Added middleware to extract and validate tenant information from requests
- **Database Session Variables**: Used PostgreSQL session variables to enforce tenant boundaries
- **Secure Service Layer**: Updated services to automatically apply tenant context to all operations
- **Security Testing**: Added integration tests to verify tenant isolation effectiveness
- **Public API Exemptions**: Configured exemptions for public endpoints like health checks and documentation

### Mobile Interface Improvements (May 2025)

- **Bottom Tab Navigation**: Implemented a fixed bottom navigation bar for mobile users with quick access to Home, Products, Orders, Messages, and More options
- **Mobile Camera Integration**: Added direct camera capture for product photos using the device camera
- **Slide-Up Menu**: Added a slide-up menu from the "More" tab for accessing Storefront, Account settings, and Sign Out
- **Simplified Navigation**: Removed top navigation bar for cleaner UI
- **Improved Product Management**: Enhanced product listing with list view and detailed edit pages
- **Next.js Configuration Update**: Updated image configuration from deprecated `domains` to recommended `remotePatterns`

### Key Mobile Experience Enhancements

- **Authentication Flow**: Fixed mobile login redirection for seamless dashboard access
- **Touch-Optimized UI**: Increased padding and spacing for mobile tap targets
- **Consistent Mobile Navigation**: Bottom tabs remain visible across all dashboard sections
- **Responsive Layout**: All pages properly respond to various device sizes

## 💻 Development Workflow

### Common Tasks

#### Adding a New Product Feature

1. Create or modify API endpoints in `backend/app/api/v1/products/`
2. Update the corresponding frontend components in `frontend/src/app/dashboard/products/`
3. Use the mobile camera integration for product images when needed
4. Test thoroughly on both desktop and mobile views

#### Implementing WhatsApp Features

1. Configure Twilio webhooks in the backend
2. Update message handling logic in `backend/app/services/messaging/`
3. Enhance the frontend chat interface in `frontend/src/app/dashboard/messages/`

### Best Practices

- **Mobile Testing**: Always test on mobile devices or using browser dev tools' mobile emulation
- **Code Organization**: Follow the established directory structure
- **Authentication**: Use Clerk for all user authentication flows
- **Image Handling**: Use Cloudinary for all media uploads
- **State Management**: Use React hooks for component state, avoid large global state
- **API Communication**: Implement consistent error handling and loading states

### Performance Considerations

- Optimize image sizes for mobile networks
- Implement proper pagination for product/order lists
- Use skeleton loaders for better perceived performance
- Leverage Next.js image optimization features

## 🔨 Running the Application

### Starting the Backend

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start development server
uvicorn app.main:app --reload
```

### Starting the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
```

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔥 Core Principles

This platform has been built with the following core principles in mind:

### Build for Scale from MVP
- Modular architecture allows for easy expansion
- API versioning to support future changes
- Multi-tenant support planned for future phases

### Mobile-First Design
- Bottom tab navigation optimized for African market users
- Direct camera integration for product management
- Responsive design that works on all device sizes

### Clean, Composable Code
- Component-based architecture in the frontend
- Service pattern in the backend
- Consistent file and directory structure

### Environment-Based Configuration
- Separate development and production settings
- Easy deployment to different environments
- Secrets management through environment variables

### Modular Architecture
- Separation of concerns across all layers
- Pluggable services for easy replacement
- Clear boundaries between components

## 🧪 Testing

### Backend Testing

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run all tests
python -m pytest

# Run tests with coverage report
python -m pytest --cov=app

# Run specific test file
python -m pytest tests/api/test_products.py

# Run tests with parameterized testing (multiple scenarios)
python -m pytest tests/api/test_products_parameterized.py
```

### Test Structure

- `/tests`: Main test directory
  - `/api`: API endpoint tests
  - `/conftest.py`: Test fixtures and configuration
  - `/test_auth.py`: Authentication tests
  - `/test_db.py`: Database connection tests

### Testing Features

- **Database Isolation**: Each test runs with a clean database state
- **Authentication Mocking**: Pre-configured test tokens for different user roles
- **Parameterized Testing**: Efficient testing of multiple scenarios
- **Transaction Management**: Automatic rollback after tests to prevent test interference

## 🔧 Recent Improvements

### Database & Performance

- **Optimistic Locking**: Prevents data corruption from concurrent modifications
  - Implementation: Version column on models with automatic increment
  - Usage: All update operations check version before committing changes

- **Database Indexing**: Strategic indexes for frequently queried fields
  - Improved Performance: Faster filtering by seller, price, and product status

- **Batch Operations**: Efficient handling of bulk updates
  - Endpoint: `POST /api/v1/products/batch`
  - Use Case: Update multiple products in a single database operation

- **Keyset Pagination**: Cursor-based pagination for large datasets
  - Endpoint: `GET /api/v1/products/keyset`
  - Benefits: Consistent performance regardless of page size or offset

### Security Enhancements

- **Role-Based Access Control**: Fine-grained permissions by user role
  - Roles: `seller`, `admin`, `customer`
  - Implementation: `app/core/security/role_based_auth.py`

- **Audit Logging**: Comprehensive security trail for sensitive operations
  - Tracked Actions: Create, update, delete, and read operations
  - Implementation: `app/services/audit_service.py`

- **Standardized Error Handling**: Consistent error responses across the API
  - Implementation: `app/core/errors/error_response.py`
  - Benefits: Better client experience and easier troubleshooting

- **Request Monitoring**: Performance tracking for API endpoints
  - Implementation: RequestTimingMiddleware in `app/main.py`
  - Features: Automatic logging of slow requests

## 📱 Application Structure

### Backend
- `/app`: Main application code
  - `/api`: API endpoints and routers
  - `/core`: Core functionality
    - `/config`: Environment-based configuration
    - `/security`: Authentication, RBAC, and JWT validation
    - `/errors`: Centralized error handling
    - `/middleware`: Rate limiting and request monitoring
  - `/models`: Database models with indexes for performance
  - `/schemas`: Pydantic schemas for validation
  - `/services`: Business logic layer with optimistic locking
  - `/db`: Database session and connection management

### Frontend
- `/src`: Main source code
  - `/app`: Next.js App Router pages
  - `/components`: Reusable UI components
  - `/hooks`: Custom React hooks
  - `/stores`: Zustand state management
  - `/types`: TypeScript type definitions
  - `/utils`: Utility functions and helpers
  - `/lib`: Utility functions

## 🧑‍💻 For Engineers & Contributors

### Development Workflow

1. **Fork and Clone**: Fork the repository and clone it locally
2. **Branch Strategy**: Create feature branches from `develop`
   - Use descriptive names: `feature/product-batch-api`, `fix/auth-token-issue`
3. **Commit Convention**: Use conventional commits
   - Format: `type(scope): message` (e.g., `feat(products): add batch update endpoint`)
4. **Pull Requests**: Submit PRs to `develop` branch with descriptive titles

### Testing Before Contribution

```bash
# Backend tests - Must pass 100%
cd backend
python -m pytest

# Run specific test scenarios
python -m pytest tests/api/test_products_parameterized.py::test_create_product_validation_cases
python -m pytest tests/api/test_products_parameterized.py::test_list_products_with_filters_parameterized

# Test specific authentication scenarios
python -m pytest tests/test_auth.py::test_dashboard_with_token
```

### Testing Different User Roles

The system supports multiple role-based test tokens:

- `test_token`: Standard seller role
- `other_token`: Another seller (for testing ownership validation)
- `admin_token`: Admin user with elevated privileges
- `customer_token`: Customer role for testing buyer flows

Example usage in tests:
```python
def test_admin_function(client):
    # Get admin privileges
    admin_headers = {"Authorization": "Bearer admin_token"}
    response = client.post("/api/v1/some-admin-endpoint", headers=admin_headers)
    assert response.status_code == 200
```

### African Market Considerations

When developing new features, keep in mind:

1. **Mobile Optimization**: Most users access via mobile devices with varying connection quality
2. **Bandwidth Efficiency**: Minimize payload sizes and implement progressive loading
3. **WhatsApp First**: Prioritize WhatsApp integrations as it's the primary messaging platform
4. **Localization**: Design with multi-language support in mind for future expansion
5. **Payment Methods**: Build with various local payment methods in mind

## 🔒 Security Notes

- All API endpoints are protected with JWT authentication
- Environment variables are used for sensitive configuration
- Media uploads are validated and sanitized
- CORS protection is implemented

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Please contact the repository owner for contribution guidelines.