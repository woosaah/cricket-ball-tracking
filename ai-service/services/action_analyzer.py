import cv2
import numpy as np
import mediapipe as mp

class ActionAnalyzer:
    """
    Bowling action analysis using MediaPipe Pose
    """

    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,  # Highest accuracy
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def analyze_action(self, video_path, start_frame, end_frame):
        """
        Analyze bowling action through a delivery

        Args:
            video_path: Path to video file
            start_frame: Start frame index
            end_frame: End frame index

        Returns:
            Dictionary with pose sequence and action metrics
        """
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        pose_sequence = []
        current_frame = start_frame

        while current_frame <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            # Convert to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Process frame
            results = self.pose.process(frame_rgb)

            if results.pose_landmarks:
                # Extract landmarks
                landmarks = []
                for landmark in results.pose_landmarks.landmark:
                    landmarks.append({
                        'x': float(landmark.x),
                        'y': float(landmark.y),
                        'z': float(landmark.z),
                        'visibility': float(landmark.visibility)
                    })

                pose_sequence.append({
                    'frame': current_frame,
                    't': (current_frame - start_frame) / fps,
                    'landmarks': landmarks
                })

            current_frame += 1

        cap.release()

        # Calculate action metrics from pose sequence
        metrics = self.calculate_action_metrics(pose_sequence)

        return {
            'pose_sequence': pose_sequence,
            'metrics': metrics
        }

    def calculate_action_metrics(self, pose_sequence):
        """
        Calculate bowling action metrics from pose sequence

        MediaPipe Pose Landmarks (33 total):
        0: nose, 11: left_shoulder, 12: right_shoulder
        13: left_elbow, 14: right_elbow, 15: left_wrist, 16: right_wrist
        23: left_hip, 24: right_hip, 25: left_knee, 26: right_knee
        27: left_ankle, 28: right_ankle, 29: left_heel, 30: right_heel
        31: left_foot_index, 32: right_foot_index

        Args:
            pose_sequence: List of pose dicts

        Returns:
            Dictionary of action metrics
        """
        if len(pose_sequence) < 10:
            return {
                'no_ball': False,
                'front_foot_distance_cm': None,
                'elbow_extension_degrees': None,
                'release_height_m': None,
                'shoulder_rotation_degrees': None,
                'stride_length_cm': None,
                'action_type': 'unknown',
                'consistency_score': 0.0
            }

        # Find release frame (highest bowling arm position)
        # Assume right-arm bowler (TODO: detect bowling arm)
        release_idx = self.find_release_frame(pose_sequence, bowling_arm='right')

        if release_idx is None:
            return {
                'no_ball': False,
                'front_foot_distance_cm': None,
                'elbow_extension_degrees': None,
                'release_height_m': None,
                'shoulder_rotation_degrees': None,
                'stride_length_cm': None,
                'action_type': 'unknown',
                'consistency_score': 0.0
            }

        release_pose = pose_sequence[release_idx]['landmarks']

        # Calculate elbow extension (angle at elbow)
        elbow_angle = self.calculate_elbow_angle(release_pose, bowling_arm='right')

        # Calculate release height (wrist y-position)
        release_height = self.calculate_release_height(release_pose, bowling_arm='right')

        # Calculate shoulder rotation
        shoulder_rotation = self.calculate_shoulder_rotation(release_pose)

        # Detect action type (side-on, front-on, mixed)
        action_type = self.classify_action_type(pose_sequence, release_idx)

        # Calculate stride length (distance between feet at release)
        stride_length = self.calculate_stride_length(release_pose)

        # Front foot position (no-ball detection)
        # This requires knowing the crease position (camera calibration)
        # For MVP, we'll use a placeholder
        front_foot_distance = self.calculate_front_foot_distance(release_pose)
        no_ball = front_foot_distance < 0  # Over the line

        # Consistency score (TODO: compare to bowler's average action)
        consistency_score = 0.8  # Placeholder

        return {
            'no_ball': no_ball,
            'front_foot_distance_cm': float(front_foot_distance) if front_foot_distance else None,
            'elbow_extension_degrees': float(elbow_angle) if elbow_angle else None,
            'release_height_m': float(release_height) if release_height else None,
            'shoulder_rotation_degrees': float(shoulder_rotation) if shoulder_rotation else None,
            'stride_length_cm': float(stride_length) if stride_length else None,
            'action_type': action_type,
            'consistency_score': float(consistency_score)
        }

    def find_release_frame(self, pose_sequence, bowling_arm='right'):
        """Find the frame where ball is released (highest wrist position)"""
        wrist_idx = 16 if bowling_arm == 'right' else 15

        min_y = float('inf')
        release_idx = None

        for i, pose in enumerate(pose_sequence):
            landmarks = pose['landmarks']
            if len(landmarks) > wrist_idx:
                wrist_y = landmarks[wrist_idx]['y']

                # Lower y value = higher on screen
                if wrist_y < min_y and landmarks[wrist_idx]['visibility'] > 0.5:
                    min_y = wrist_y
                    release_idx = i

        return release_idx

    def calculate_elbow_angle(self, landmarks, bowling_arm='right'):
        """Calculate elbow angle (extension)"""
        if bowling_arm == 'right':
            shoulder_idx, elbow_idx, wrist_idx = 12, 14, 16
        else:
            shoulder_idx, elbow_idx, wrist_idx = 11, 13, 15

        if len(landmarks) > max(shoulder_idx, elbow_idx, wrist_idx):
            shoulder = np.array([landmarks[shoulder_idx]['x'], landmarks[shoulder_idx]['y']])
            elbow = np.array([landmarks[elbow_idx]['x'], landmarks[elbow_idx]['y']])
            wrist = np.array([landmarks[wrist_idx]['x'], landmarks[wrist_idx]['y']])

            # Calculate angle using vectors
            v1 = shoulder - elbow
            v2 = wrist - elbow

            angle = np.arccos(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
            angle_degrees = np.degrees(angle)

            # Elbow extension is 180 - angle
            extension = 180 - angle_degrees

            return extension

        return None

    def calculate_release_height(self, landmarks, bowling_arm='right'):
        """Calculate release height (normalized to ankle)"""
        wrist_idx = 16 if bowling_arm == 'right' else 15
        ankle_idx = 28 if bowling_arm == 'right' else 27

        if len(landmarks) > max(wrist_idx, ankle_idx):
            wrist_y = landmarks[wrist_idx]['y']
            ankle_y = landmarks[ankle_idx]['y']

            # Height is difference (normalized 0-1 in frame)
            # Convert to approximate meters (assuming average person height ~1.75m)
            height_normalized = ankle_y - wrist_y
            height_m = height_normalized * 1.75  # Rough approximation

            return height_m

        return None

    def calculate_shoulder_rotation(self, landmarks):
        """Calculate shoulder rotation (chest-on vs side-on)"""
        left_shoulder_idx, right_shoulder_idx = 11, 12

        if len(landmarks) > max(left_shoulder_idx, right_shoulder_idx):
            left_shoulder = np.array([landmarks[left_shoulder_idx]['x'],
                                     landmarks[left_shoulder_idx]['y']])
            right_shoulder = np.array([landmarks[right_shoulder_idx]['x'],
                                       landmarks[right_shoulder_idx]['y']])

            # Calculate shoulder line angle relative to horizontal
            shoulder_vector = right_shoulder - left_shoulder
            angle = np.arctan2(shoulder_vector[1], shoulder_vector[0])
            angle_degrees = np.degrees(angle)

            # Normalize to 0-180 (0 = side-on, 90 = front-on)
            rotation = abs(angle_degrees)

            return rotation

        return None

    def calculate_stride_length(self, landmarks):
        """Calculate stride length (distance between feet)"""
        left_ankle_idx, right_ankle_idx = 27, 28

        if len(landmarks) > max(left_ankle_idx, right_ankle_idx):
            left_ankle = np.array([landmarks[left_ankle_idx]['x'],
                                  landmarks[left_ankle_idx]['y']])
            right_ankle = np.array([landmarks[right_ankle_idx]['x'],
                                   landmarks[right_ankle_idx]['y']])

            # Calculate distance (normalized)
            distance = np.linalg.norm(right_ankle - left_ankle)

            # Convert to approximate cm (assuming frame width ~pitch width ~3m = 300cm)
            distance_cm = distance * 300  # Rough approximation

            return distance_cm

        return None

    def calculate_front_foot_distance(self, landmarks):
        """
        Calculate front foot distance from crease

        TODO: Requires camera calibration and crease position detection
        For MVP, this is a placeholder
        """
        # Placeholder: assume front foot is right foot for right-arm bowler
        right_toe_idx = 32

        if len(landmarks) > right_toe_idx:
            # Placeholder: return positive distance (legal delivery)
            return 15.0  # cm behind crease

        return None

    def classify_action_type(self, pose_sequence, release_idx):
        """Classify bowling action as side-on, front-on, or mixed"""
        if release_idx < len(pose_sequence):
            release_pose = pose_sequence[release_idx]['landmarks']
            shoulder_rotation = self.calculate_shoulder_rotation(release_pose)

            if shoulder_rotation:
                if shoulder_rotation < 30:
                    return 'side_on'
                elif shoulder_rotation > 60:
                    return 'front_on'
                else:
                    return 'mixed'

        return 'unknown'
