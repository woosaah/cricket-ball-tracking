import psycopg2
from psycopg2.extras import Json, RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.conn_string = os.getenv('DATABASE_URL')
        self.conn = None

    def get_connection(self):
        """Get database connection"""
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(self.conn_string)
        return self.conn

    def execute_query(self, query, params=None, fetch=True):
        """Execute a query and return results"""
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
        return result

    def get_session(self, session_id):
        """Get session by ID"""
        result = self.execute_query(
            'SELECT * FROM sessions WHERE id = %s',
            (session_id,)
        )
        return result[0] if result else None

    def update_session_status(self, session_id, status, processed=False, error=None):
        """Update session processing status"""
        self.execute_query(
            '''UPDATE sessions
               SET processing_status = %s,
                   processed = %s,
                   processing_error = %s
               WHERE id = %s''',
            (status, processed, error, session_id),
            fetch=False
        )

    def update_session_duration(self, session_id, duration_seconds):
        """Update session video duration"""
        self.execute_query(
            'UPDATE sessions SET video_duration_seconds = %s WHERE id = %s',
            (duration_seconds, session_id),
            fetch=False
        )

    def insert_delivery(self, session_id, bowler_id, delivery_number,
                       video_start_time, video_end_time, trajectory, metrics):
        """Insert delivery data"""
        result = self.execute_query(
            '''INSERT INTO deliveries (
                session_id, bowler_id, delivery_number,
                video_start_time, video_end_time, trajectory,
                release_speed_kmh, bounce_point_m, bounce_height_m,
                swing_movement_mm, seam_movement_mm, delivery_type, line,
                tracking_confidence
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id''',
            (
                session_id, bowler_id, delivery_number,
                video_start_time, video_end_time, Json(trajectory),
                metrics.get('release_speed_kmh'),
                metrics.get('bounce_point_m'),
                metrics.get('bounce_height_m'),
                metrics.get('swing_movement_mm'),
                metrics.get('seam_movement_mm'),
                metrics.get('delivery_type'),
                metrics.get('line'),
                metrics.get('tracking_confidence', 0.0)
            )
        )
        return result[0]['id'] if result else None

    def insert_bowling_action(self, delivery_id, bowler_id, pose_sequence, metrics):
        """Insert bowling action data"""
        result = self.execute_query(
            '''INSERT INTO bowling_actions (
                delivery_id, bowler_id, pose_sequence,
                no_ball, front_foot_distance_cm, elbow_extension_degrees,
                release_height_m, shoulder_rotation_degrees, stride_length_cm,
                action_type, consistency_score
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id''',
            (
                delivery_id, bowler_id, Json(pose_sequence),
                metrics.get('no_ball', False),
                metrics.get('front_foot_distance_cm'),
                metrics.get('elbow_extension_degrees'),
                metrics.get('release_height_m'),
                metrics.get('shoulder_rotation_degrees'),
                metrics.get('stride_length_cm'),
                metrics.get('action_type'),
                metrics.get('consistency_score', 0.0)
            )
        )
        return result[0]['id'] if result else None

    def insert_insight(self, bowler_id, session_id, insight_type, severity,
                      title, description, impact, recommendation,
                      video_timestamp=None, delivery_ids=None):
        """Insert coaching insight"""
        result = self.execute_query(
            '''INSERT INTO insights (
                bowler_id, session_id, insight_type, severity,
                title, description, impact, recommendation,
                video_timestamp, delivery_ids
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id''',
            (
                bowler_id, session_id, insight_type, severity,
                title, description, impact, recommendation,
                video_timestamp, delivery_ids
            )
        )
        return result[0]['id'] if result else None

    def get_deliveries_for_session(self, session_id):
        """Get all deliveries for a session"""
        return self.execute_query(
            '''SELECT d.*, ba.*
               FROM deliveries d
               LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
               WHERE d.session_id = %s
               ORDER BY d.delivery_number''',
            (session_id,)
        )

    def get_bowler_average_metrics(self, bowler_id):
        """Get average metrics for a bowler"""
        result = self.execute_query(
            '''SELECT
                AVG(release_speed_kmh) as avg_speed,
                AVG(ba.release_height_m) as avg_release_height,
                AVG(ba.elbow_extension_degrees) as avg_elbow_extension,
                AVG(ba.shoulder_rotation_degrees) as avg_shoulder_rotation
               FROM deliveries d
               LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
               WHERE d.bowler_id = %s''',
            (bowler_id,)
        )
        return result[0] if result else {}

    def close(self):
        """Close database connection"""
        if self.conn and not self.conn.closed:
            self.conn.close()
