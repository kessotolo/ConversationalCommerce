# Conversational Commerce Platform

A high-growth commerce platform for African markets that seamlessly integrates mobile-first storefronts with WhatsApp messaging capabilities. Built for scale with security and performance in mind.

## 🌟 Key Features

- **Seller Authentication**: Secure JWT-based authentication through Clerk with role-based access control
- **Product Management**: Full CRUD operations with rich media support and batch operations
- **WhatsApp Integration**: Direct customer engagement through conversational commerce
- **Mobile-First Design**: Optimized for the primary devices used in African markets
- **Multi-Media Support**: Images, video, and WhatsApp status content handling
- **Advanced Security**: Comprehensive audit logging, request monitoring, and optimistic locking
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
- **Zustand**: Lightweight state management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.10+
- PostgreSQL database
- Clerk account (authentication)
- Cloudinary account (media storage)
- Twilio account (WhatsApp messaging)

### Environment Setup

1. **Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (copy from example)
cp .env.example .env
# Edit .env with your configuration
```

2. **Frontend Setup**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables (copy from example)
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Running the Application

1. **Backend**

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

2. **Frontend**

```bash
cd frontend
npm run dev
```

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