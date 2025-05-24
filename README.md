# Conversational Commerce Platform

A high-growth commerce platform for African markets that seamlessly integrates mobile-first storefronts with WhatsApp messaging capabilities.

## 🌟 Key Features

- **Seller Authentication**: Secure JWT-based authentication through Clerk
- **Product Management**: Full CRUD operations with rich media support
- **WhatsApp Integration**: Direct customer engagement through conversational commerce
- **Mobile-First Design**: Optimized for the primary devices used in African markets
- **Multi-Media Support**: Images, video, and WhatsApp status content handling

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

## 📱 Application Structure

### Backend
- `/app`: Main application code
  - `/api`: API endpoints and routers
  - `/core`: Core functionality (config, security, etc.)
  - `/models`: Database models
  - `/schemas`: Pydantic schemas for validation

### Frontend
- `/src`: Main source code
  - `/app`: Next.js App Router pages
  - `/components`: Reusable UI components
  - `/lib`: Utility functions
  - `/hooks`: Custom React hooks

## 🔒 Security Notes

- All API endpoints are protected with JWT authentication
- Environment variables are used for sensitive configuration
- Media uploads are validated and sanitized
- CORS protection is implemented

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Please contact the repository owner for contribution guidelines.