# Conversational Commerce Platform

A modern e-commerce platform with AI-powered conversational features, built with Next.js, FastAPI, and Clerk authentication.

## Features

- 🛍️ Modern e-commerce storefront
- 💬 AI-powered customer conversations
- 📱 Mobile-first responsive design
- 🔐 Secure authentication with Clerk
- 📊 Real-time analytics dashboard
- 🚀 Fast and scalable architecture

## Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Clerk Authentication
- Zustand State Management

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic Migrations
- Pydantic

### Infrastructure
- Railway (Backend)
- Vercel (Frontend)
- Cloudinary (Media)
- Twilio (SMS)

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL
- Docker (optional)

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure your environment variables
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
uvicorn app.main:app --reload
```

## Development

### Running Tests
```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
pytest
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

### Backend (Railway)
1. Push to GitHub
2. Connect repository to Railway
3. Configure environment variables
4. Deploy

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_API_URL=your_api_url
```

### Backend (.env)
```env
DATABASE_URL=your_database_url
CLERK_SECRET_KEY=your_clerk_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.