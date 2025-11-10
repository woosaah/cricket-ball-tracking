# Cricket Coaching AI - Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Docker & Docker Compose
- FFmpeg

## Database Setup

### 1. Connect to PostgreSQL on deathstar
```bash
psql -h 192.168.1.243 -U postgres
```

### 2. Create database
```sql
CREATE DATABASE cricket_coach;
\c cricket_coach
```

### 3. Run schema
```bash
psql -h 192.168.1.243 -U postgres -d cricket_coach < docs/schema.sql
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials
npm run dev
```

Backend runs on: http://localhost:3000

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: http://localhost:3001

## AI Service Setup

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Or use Docker
docker-compose up ai-service
```

AI Service runs on: http://localhost:5001

## Environment Variables

### Backend (.env)
```
PORT=3000
DATABASE_URL=postgresql://user:password@192.168.1.243:5432/cricket_coach
JWT_SECRET=your-secret-key-here
AI_SERVICE_URL=http://localhost:5001
UPLOAD_DIR=/var/cricket-coach/videos
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3000
```

### AI Service (.env)
```
FLASK_ENV=development
DATABASE_URL=postgresql://user:password@192.168.1.243:5432/cricket_coach
MODEL_PATH=/app/models
```

## Camera Setup

### Recording Guidelines
- Position: 7m perpendicular from pitch center
- Height: 1.8m (tripod mounted)
- Resolution: 1080p
- Frame rate: 30fps minimum (60fps preferred)
- Focus: Manual (locked on pitch center)

### Test Recording
Record 20 deliveries tonight with Cole to validate system.

## Development Workflow

1. **Upload Video**: Coach uploads session video via dashboard
2. **Processing**: AI service detects ball + analyzes action
3. **Results**: Dashboard displays trajectory, metrics, insights
4. **Export**: Generate VR playlist for Quest 3

## API Documentation

See: http://localhost:3000/api-docs (Swagger)

## MVP Timeline

- **Days 1-2**: Core infrastructure ✅
- **Days 3-5**: Ball tracking
- **Days 6-8**: Action analysis
- **Days 9-11**: Analytics
- **Days 12-14**: VR export
- **Days 15-17**: Polish & testing

## Target Launch

December 1, 2025 - Demo ready for Shane Bond

## Support

Contact: Stuart (Rangiora, NZ)
Server: deathstar (192.168.1.243)
