from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import traceback

from services.video_processor import VideoProcessor
from services.ball_tracker import BallTracker
from services.action_analyzer import ActionAnalyzer
from services.insights_generator import InsightsGenerator
from config.database import Database

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize services
db = Database()
video_processor = VideoProcessor()
ball_tracker = BallTracker()
action_analyzer = ActionAnalyzer()
insights_generator = InsightsGenerator(db)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'cricket-coach-ai-service',
        'version': '1.0.0'
    })

@app.route('/process', methods=['POST'])
def process_video():
    """
    Process a cricket session video

    Expected JSON payload:
    {
        "session_id": "uuid",
        "video_path": "/path/to/video.mp4"
    }
    """
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        video_path = data.get('video_path')

        if not session_id or not video_path:
            return jsonify({'error': 'session_id and video_path are required'}), 400

        print(f"🏏 Processing session: {session_id}")
        print(f"📹 Video: {video_path}")

        # Update session status
        db.update_session_status(session_id, 'processing')

        # Extract video info
        video_info = video_processor.get_video_info(video_path)
        db.update_session_duration(session_id, video_info['duration'])

        # Detect deliveries (find segments where ball is in motion)
        print("🔍 Detecting deliveries...")
        delivery_segments = video_processor.detect_delivery_segments(video_path)
        print(f"✅ Found {len(delivery_segments)} deliveries")

        # Process each delivery
        deliveries_data = []
        for i, segment in enumerate(delivery_segments):
            print(f"\n📦 Processing delivery {i+1}/{len(delivery_segments)}")

            start_frame, end_frame = segment['start_frame'], segment['end_frame']
            start_time = segment['start_time']
            end_time = segment['end_time']

            # Track ball
            print("  🎾 Tracking ball...")
            trajectory_data = ball_tracker.track_ball(
                video_path,
                start_frame,
                end_frame
            )

            if not trajectory_data or len(trajectory_data['trajectory']) < 10:
                print("  ⚠️  Insufficient tracking data, skipping delivery")
                continue

            # Analyze bowling action
            print("  🤸 Analyzing action...")
            action_data = action_analyzer.analyze_action(
                video_path,
                start_frame,
                end_frame
            )

            # Get bowler_id from session
            session = db.get_session(session_id)
            bowler_id = session['bowler_id']

            # Save delivery to database
            delivery_id = db.insert_delivery(
                session_id=session_id,
                bowler_id=bowler_id,
                delivery_number=i + 1,
                video_start_time=start_time,
                video_end_time=end_time,
                trajectory=trajectory_data['trajectory'],
                metrics=trajectory_data['metrics']
            )

            # Save action analysis
            if action_data:
                db.insert_bowling_action(
                    delivery_id=delivery_id,
                    bowler_id=bowler_id,
                    pose_sequence=action_data['pose_sequence'],
                    metrics=action_data['metrics']
                )

            deliveries_data.append({
                'delivery_id': delivery_id,
                'delivery_number': i + 1,
                'speed': trajectory_data['metrics'].get('release_speed_kmh'),
                'delivery_type': trajectory_data['metrics'].get('delivery_type')
            })

            print(f"  ✅ Speed: {trajectory_data['metrics'].get('release_speed_kmh', 0):.1f} km/h")

        # Generate insights
        print("\n💡 Generating insights...")
        insights = insights_generator.generate_insights(session_id, bowler_id)
        print(f"✅ Generated {len(insights)} insights")

        # Mark session as completed
        db.update_session_status(session_id, 'completed', processed=True)

        return jsonify({
            'status': 'success',
            'session_id': session_id,
            'deliveries': len(deliveries_data),
            'insights': len(insights),
            'data': deliveries_data
        })

    except Exception as e:
        print(f"❌ Error processing video: {str(e)}")
        traceback.print_exc()

        if 'session_id' in locals():
            db.update_session_status(
                session_id,
                'failed',
                error=str(e)
            )

        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"🚀 Starting AI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')
