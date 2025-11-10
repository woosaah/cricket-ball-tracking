import cv2
import numpy as np
from ultralytics import YOLO
from filterpy.kalman import KalmanFilter
import os

class BallTracker:
    """
    Ball detection and tracking using YOLOv8 + Kalman filter
    """

    def __init__(self):
        # Load YOLO model (initially use pretrained, later custom trained)
        model_path = os.getenv('MODEL_PATH', './models')
        ball_model_name = os.getenv('BALL_MODEL', 'yolov8n.pt')  # Start with base model

        try:
            self.model = YOLO(os.path.join(model_path, ball_model_name))
            print(f"✅ Loaded ball detection model: {ball_model_name}")
        except:
            # Fallback to base YOLOv8
            print("⚠️  Custom model not found, using YOLOv8n base model")
            self.model = YOLO('yolov8n.pt')

        self.confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', 0.5))

        # Kalman filter for smooth tracking
        self.kf = None

    def init_kalman_filter(self):
        """Initialize Kalman filter for ball tracking"""
        kf = KalmanFilter(dim_x=4, dim_z=2)

        # State: [x, y, vx, vy]
        kf.x = np.array([0., 0., 0., 0.])

        # State transition matrix (constant velocity model)
        kf.F = np.array([
            [1., 0., 1., 0.],
            [0., 1., 0., 1.],
            [0., 0., 1., 0.],
            [0., 0., 0., 1.]
        ])

        # Measurement matrix
        kf.H = np.array([
            [1., 0., 0., 0.],
            [0., 1., 0., 0.]
        ])

        # Covariance matrices
        kf.P *= 1000.  # Initial uncertainty
        kf.R = np.array([[5., 0.], [0., 5.]])  # Measurement noise
        kf.Q = np.eye(4) * 0.1  # Process noise

        return kf

    def detect_ball(self, frame):
        """
        Detect ball in a single frame using YOLO

        Returns:
            (x, y, confidence) or None if not detected
        """
        results = self.model(frame, verbose=False)

        # For MVP with base YOLO, detect sports ball class (class 32)
        # Later, with custom trained model, detect cricket ball specifically

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])

                # Class 32 is "sports ball" in COCO dataset
                # For custom model, this would be cricket ball class
                if cls == 32 and conf > self.confidence_threshold:
                    # Get bounding box center
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    center_x = (x1 + x2) / 2
                    center_y = (y1 + y2) / 2

                    return (center_x, center_y, conf)

        return None

    def track_ball(self, video_path, start_frame, end_frame):
        """
        Track ball through a delivery

        Args:
            video_path: Path to video file
            start_frame: Start frame index
            end_frame: End frame index

        Returns:
            Dictionary with trajectory data and metrics
        """
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        # Initialize Kalman filter
        kf = self.init_kalman_filter()

        trajectory = []
        current_frame = start_frame
        frames_since_detection = 0
        max_missed_frames = 10  # Maximum frames to predict without detection

        while current_frame <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            # Detect ball
            detection = self.detect_ball(frame)

            if detection:
                x, y, conf = detection
                frames_since_detection = 0

                # Update Kalman filter
                kf.predict()
                kf.update(np.array([x, y]))

                # Store tracked position
                trajectory.append({
                    'frame': current_frame,
                    'x': float(kf.x[0]),
                    'y': float(kf.x[1]),
                    't': (current_frame - start_frame) / fps,
                    'confidence': conf,
                    'detected': True
                })
            else:
                # Use Kalman prediction for missed detections
                frames_since_detection += 1

                if frames_since_detection < max_missed_frames:
                    kf.predict()

                    trajectory.append({
                        'frame': current_frame,
                        'x': float(kf.x[0]),
                        'y': float(kf.x[1]),
                        't': (current_frame - start_frame) / fps,
                        'confidence': 0.0,
                        'detected': False
                    })

            current_frame += 1

        cap.release()

        # Calculate metrics from trajectory
        metrics = self.calculate_metrics(trajectory, fps)

        return {
            'trajectory': trajectory,
            'metrics': metrics
        }

    def calculate_metrics(self, trajectory, fps):
        """
        Calculate delivery metrics from trajectory

        Args:
            trajectory: List of position dicts
            fps: Video frame rate

        Returns:
            Dictionary of metrics
        """
        if len(trajectory) < 10:
            return {
                'release_speed_kmh': None,
                'bounce_point_m': None,
                'bounce_height_m': None,
                'swing_movement_mm': None,
                'seam_movement_mm': None,
                'delivery_type': 'unknown',
                'line': 'unknown',
                'tracking_confidence': 0.0
            }

        # Extract positions
        positions = np.array([[p['x'], p['y']] for p in trajectory])
        times = np.array([p['t'] for p in trajectory])
        confidences = np.array([p['confidence'] for p in trajectory])

        # Calculate speed (initial velocity)
        # Assumes pixels-to-meters calibration (TODO: camera calibration)
        PIXELS_PER_METER = 50  # Placeholder - needs camera calibration

        if len(positions) >= 5:
            # Use first 5 points to estimate initial velocity
            dt = times[4] - times[0]
            dx = positions[4, 0] - positions[0, 0]
            dy = positions[4, 1] - positions[0, 1]

            velocity_pixels_per_sec = np.sqrt(dx**2 + dy**2) / dt
            velocity_m_per_sec = velocity_pixels_per_sec / PIXELS_PER_METER
            speed_kmh = velocity_m_per_sec * 3.6
        else:
            speed_kmh = None

        # Detect bounce point (highest y value = lowest on screen)
        bounce_idx = np.argmax(positions[:, 1])
        bounce_point_pixels = positions[bounce_idx, 1]
        bounce_point_m = bounce_point_pixels / PIXELS_PER_METER  # Placeholder

        # Calculate swing/seam (lateral movement)
        # Simplified: measure horizontal deviation
        horizontal_positions = positions[:, 0]
        swing_movement = np.std(horizontal_positions)  # Placeholder metric

        # Classify delivery type based on trajectory length and bounce point
        delivery_duration = times[-1] - times[0]

        if bounce_point_m < 3:
            delivery_type = 'yorker'
        elif bounce_point_m > 7:
            delivery_type = 'bouncer'
        elif 4 < bounce_point_m < 6:
            delivery_type = 'good_length'
        else:
            delivery_type = 'full'

        # Average confidence
        avg_confidence = np.mean(confidences[confidences > 0]) if np.any(confidences > 0) else 0.0

        return {
            'release_speed_kmh': float(speed_kmh) if speed_kmh else None,
            'bounce_point_m': float(bounce_point_m) if bounce_point_m else None,
            'bounce_height_m': None,  # TODO: 3D reconstruction
            'swing_movement_mm': float(swing_movement * 10) if swing_movement else None,
            'seam_movement_mm': None,  # TODO: after-bounce analysis
            'delivery_type': delivery_type,
            'line': 'middle',  # TODO: pitch position analysis
            'tracking_confidence': float(avg_confidence)
        }
