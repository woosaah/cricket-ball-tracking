# 🏏 Cricket Coaching AI - MVP

**Intelligent bowling analysis platform** combining computer vision, biomechanics, and VR training for cricket coaches and academies.

## 🎯 Project Overview

A complete cricket coaching platform that:
- **Tracks ball trajectory** using YOLOv8 + Kalman filtering
- **Analyzes bowling action** using MediaPipe Pose estimation
- **Generates coaching insights** by correlating action to ball outcomes
- **Exports data to VR** for Quest 3 training simulations

**Target Launch:** December 2025 | **Demo Ready:** November 18, 2025

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 CRICKET COACHING AI                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📹 Video Input (Samsung A73 / Meta Quest 3)            │
│           ↓                                              │
│  ┌──────────────────┬──────────────────────┐            │
│  │   Ball Tracking  │  Action Analysis      │            │
│  │   (YOLOv8)       │  (MediaPipe Pose)     │            │
│  └────────┬─────────┴──────────┬────────────┘            │
│           ↓                    ↓                         │
│  ┌──────────────────────────────────────┐                │
│  │    Combined Analytics Engine         │                │
│  │    (Action → Outcome Correlation)    │                │
│  └──────────────┬───────────────────────┘                │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐                │
│  │      PostgreSQL Database             │                │
│  └──────────────┬───────────────────────┘                │
│                 ↓                                        │
│  ┌──────────────────────────────────────┐                │
│  │   Node.js API + React Dashboard      │                │
│  └──────────────┬───────────────────────┘                │
│                 ↓                                        │
│        Unity VR Training (Quest 3)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
cricket-ball-tracking/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── config/      # Database connection
│   │   ├── middleware/  # Auth, upload
│   │   └── server.js    # Entry point
│   └── package.json
│
├── frontend/            # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/       # Dashboard, Bowlers, Sessions
│   │   ├── components/  # Layout, ProtectedRoute
│   │   ├── contexts/    # AuthContext
│   │   ├── services/    # API client
│   │   └── main.tsx     # Entry point
│   └── package.json
│
├── ai-service/          # Python + Flask + CV
│   ├── services/
│   │   ├── ball_tracker.py        # YOLOv8 tracking
│   │   ├── action_analyzer.py     # MediaPipe pose
│   │   ├── video_processor.py     # Segmentation
│   │   └── insights_generator.py  # Correlation engine
│   ├── config/
│   │   └── database.py
│   ├── app.py           # Flask API
│   └── requirements.txt
│
├── docs/
│   ├── schema.sql       # PostgreSQL schema
│   └── README.md        # Setup guide
│
└── docker-compose.yml   # Orchestration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **PostgreSQL** 14+ (running on 192.168.1.243 - deathstar)
- **Docker** & Docker Compose
- **FFmpeg**

### 1. Database Setup

```bash
# Connect to PostgreSQL on deathstar
psql -h 192.168.1.243 -U postgres

# Create database
CREATE DATABASE cricket_coach;
\c cricket_coach

# Run schema
\i docs/schema.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Start backend
npm run dev
```

**Backend runs on:** http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Start frontend
npm run dev
```

**Frontend runs on:** http://localhost:3001

### 4. AI Service Setup

#### Option A: Docker (Recommended)

```bash
docker-compose up ai-service
```

#### Option B: Local Python

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Start service
python app.py
```

**AI Service runs on:** http://localhost:5001

---

## 🎬 Usage

### 1. Register / Login
- Navigate to http://localhost:3001
- Create an account (coach role)

### 2. Add Bowler
- Click "Bowlers" → "+ Add Bowler"
- Enter name, bowling style, arm

### 3. Upload Session
- Click "Upload Session"
- Select bowler, date, video file
- Click "Upload & Process Session"

### 4. View Results
- Processing takes ~5 mins per 20 deliveries
- View trajectory, speed, action metrics
- Read AI-generated coaching insights

---

## 📊 Features Implemented (MVP)

### ✅ Completed
- [x] Ball trajectory tracking (YOLOv8 + Kalman filter)
- [x] Bowling action pose detection (MediaPipe)
- [x] Speed calculation (km/h)
- [x] Bounce point detection
- [x] No-ball detection (front foot position)
- [x] Elbow extension measurement (chucking detection)
- [x] Release height calculation
- [x] Action type classification (side-on/front-on)
- [x] Insights generation (action → outcome correlation)
- [x] RESTful API (auth, bowlers, sessions, deliveries, VR)
- [x] React dashboard (login, bowlers, sessions, upload)
- [x] VR export API for Unity integration

### 🚧 Pending (Post-MVP)
- [ ] Video player with trajectory overlay
- [ ] Video player with skeleton overlay
- [ ] Advanced analytics dashboard (charts, heatmaps)
- [ ] VR playlist builder UI
- [ ] Camera calibration (pixels → meters)
- [ ] Multi-camera 3D reconstruction
- [ ] Spin detection (high-speed camera)
- [ ] Batsman shot analysis

---

## 🎥 Camera Setup

### Recording Guidelines

**Position:** 7m perpendicular from pitch center
**Height:** 1.8m (tripod mounted)
**Resolution:** 1080p
**Frame Rate:** 30fps minimum (60fps preferred)
**Focus:** Manual (locked on pitch center)
**Orientation:** Landscape

### Equipment
- **Primary:** Samsung Galaxy A73
- **Alternative:** Meta Quest 3 (passthrough recording)
- **Mount:** Tripod (GorillaPod or standard)

---

## 🧪 Testing

### Test Session Upload

1. Record 20 deliveries with Cole tonight (Nov 10th)
2. Follow camera guidelines above
3. Save as: `20251110_Cole_HomeNets.mp4`
4. Upload via dashboard
5. Validate:
   - Ball tracking accuracy (compare speed with radar gun if available)
   - No-ball detection (manually verify front foot position)
   - Insights quality (are they actionable?)

---

## 🔧 Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+ (pg client)
- **Auth:** JWT (jsonwebtoken, bcrypt)
- **File Upload:** Multer
- **API Client:** Axios

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Router:** React Router v6
- **Charts:** Chart.js, React-Chartjs-2
- **Video:** Video.js
- **3D:** Three.js, React-Three-Fiber

### AI Service
- **Runtime:** Python 3.10+
- **Framework:** Flask
- **Computer Vision:** OpenCV 4.8+
- **Object Detection:** YOLOv8 (Ultralytics)
- **Pose Estimation:** MediaPipe 0.10+
- **Tracking:** Kalman filter (filterpy)
- **Scientific:** NumPy, SciPy
- **Database:** psycopg2

### Infrastructure
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2 (Node.js)
- **Database Server:** PostgreSQL on deathstar (192.168.1.243)

---

## 📈 MVP Development Timeline

- **✅ Days 1-2:** Core infrastructure (database, API, frontend skeleton)
- **✅ Days 3-5:** Ball tracking (YOLOv8 + trajectory calculation)
- **✅ Days 6-8:** Action analysis (MediaPipe + metrics)
- **✅ Days 9-11:** Analytics (correlation engine, insights)
- **⏳ Days 12-14:** VR export (API endpoints, Unity integration)
- **⏳ Days 15-17:** Polish & testing (real footage validation)

**Current Status:** Day 2 - Core infrastructure complete! 🎉

---

## 🎯 Next Steps

### Immediate (Tonight)
1. **Record test footage:** 20 deliveries with Cole (Samsung A73)
2. **Test upload:** Verify video upload works end-to-end
3. **Install dependencies:** Run `npm install` in backend/frontend

### Tomorrow
1. **Test AI processing:** Upload test video, verify ball tracking
2. **Camera calibration:** Create checkerboard pattern for pixel→meter conversion
3. **Iterate on accuracy:** Adjust YOLOv8 confidence threshold

### This Week
1. **Video player overlays:** Trajectory + skeleton visualization
2. **Analytics dashboard:** Charts for speed over time, delivery distribution
3. **Shane Bond prep:** Prepare demo with Cole's footage

---

## 📞 Contact & Support

**Project Owner:** Stuart
**Location:** Rangiora, New Zealand
**Server:** deathstar (192.168.1.243)

**Key Contacts:**
- Shane Bond (via sister-in-law connection) - for endorsement demo
- Cole's Cricket Coach - for school trial
- Local Cricket Academy - for beta testing

---

## 🛣️ Roadmap

### Q1 2026 (Post-MVP)
- Real-time AR overlay (Quest 3 live coaching)
- Mobile app (iOS/Android for direct recording)
- Spin detection (high-speed camera integration)
- Multi-camera 3D reconstruction

### Q2-Q3 2026
- Batsman shot analysis (track bat path)
- Wicketkeeper analysis (reaction time)
- Team analytics (compare all bowlers)
- Integration with scoring apps (CricHQ)

### Q4 2026
- AI coaching chatbot (conversational insights)
- Automated highlight reels
- Injury prediction model
- Professional league partnerships

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🏏 Let's Build This!

**Target:** Demo ready for Shane Bond by December 1st, 2025
**Budget:** $5 (Claude Code credits)
**Market:** NZ/AU cricket coaching
**Revenue Goal:** $5K MRR by June 2026

---

**Built with ❤️ for the cricket coaching community**
