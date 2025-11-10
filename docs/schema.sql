-- Cricket Coaching AI - Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('coach', 'admin', 'bowler')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bowlers (Athletes)
CREATE TABLE bowlers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  bowling_style VARCHAR(50) CHECK (bowling_style IN ('fast', 'medium', 'spin')),
  bowling_arm VARCHAR(10) CHECK (bowling_arm IN ('right', 'left')),
  height_cm INTEGER,
  weight_kg INTEGER,
  profile_photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bowler_id UUID REFERENCES bowlers(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  location VARCHAR(255),
  video_url TEXT NOT NULL,
  video_duration_seconds INTEGER,
  camera_calibration JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual Deliveries (Ball Tracking Results)
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  bowler_id UUID REFERENCES bowlers(id) ON DELETE CASCADE,
  delivery_number INTEGER NOT NULL,
  video_start_time FLOAT,
  video_end_time FLOAT,

  -- Ball trajectory data (JSON array of {frame, x, y, t})
  trajectory JSONB NOT NULL,

  -- Calculated metrics
  release_speed_kmh FLOAT,
  bounce_point_m FLOAT,
  bounce_height_m FLOAT,
  swing_movement_mm FLOAT,
  seam_movement_mm FLOAT,
  delivery_type VARCHAR(50),
  line VARCHAR(50),

  -- Quality scores
  tracking_confidence FLOAT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bowling Actions (Pose Analysis Results)
CREATE TABLE bowling_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  bowler_id UUID REFERENCES bowlers(id) ON DELETE CASCADE,

  -- Pose sequence data (JSON array of frames with landmarks)
  pose_sequence JSONB NOT NULL,

  -- Action metrics
  no_ball BOOLEAN DEFAULT FALSE,
  front_foot_distance_cm FLOAT,
  elbow_extension_degrees FLOAT,
  release_height_m FLOAT,
  shoulder_rotation_degrees FLOAT,
  stride_length_cm FLOAT,
  action_type VARCHAR(50) CHECK (action_type IN ('side_on', 'front_on', 'mixed')),

  -- Consistency & comparison
  consistency_score FLOAT,
  comparison_scores JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Action-Outcome Correlations & Coaching Insights
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bowler_id UUID REFERENCES bowlers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,

  -- Insight details
  insight_type VARCHAR(100) CHECK (insight_type IN ('action_flaw', 'strength', 'trend', 'injury_risk')),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  impact TEXT,
  recommendation TEXT,

  -- References
  video_timestamp FLOAT,
  delivery_ids UUID[],
  pro_comparison_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- VR Training Playlists
CREATE TABLE vr_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bowler_id UUID REFERENCES bowlers(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  delivery_ids UUID[],
  difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  focus_area VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Camera Calibrations
CREATE TABLE camera_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  device VARCHAR(100),
  calibration_matrix JSONB NOT NULL,
  pitch_dimensions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_bowler ON sessions(bowler_id);
CREATE INDEX idx_sessions_coach ON sessions(coach_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_deliveries_session ON deliveries(session_id);
CREATE INDEX idx_deliveries_bowler ON deliveries(bowler_id);
CREATE INDEX idx_actions_delivery ON bowling_actions(delivery_id);
CREATE INDEX idx_actions_bowler ON bowling_actions(bowler_id);
CREATE INDEX idx_insights_bowler ON insights(bowler_id);
CREATE INDEX idx_insights_session ON insights(session_id);
CREATE INDEX idx_vr_playlists_bowler ON vr_playlists(bowler_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bowlers_updated_at BEFORE UPDATE ON bowlers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bowling_actions_updated_at BEFORE UPDATE ON bowling_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vr_playlists_updated_at BEFORE UPDATE ON vr_playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_camera_calibrations_updated_at BEFORE UPDATE ON camera_calibrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
