import cv2
import numpy as np

class VideoProcessor:
    """
    Video processing utilities for detecting delivery segments
    """

    def get_video_info(self, video_path):
        """Extract video metadata"""
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0

        cap.release()

        return {
            'fps': fps,
            'frame_count': frame_count,
            'width': width,
            'height': height,
            'duration': duration
        }

    def detect_delivery_segments(self, video_path, min_gap_seconds=5):
        """
        Detect individual delivery segments in a session video

        This is a simplified approach that:
        1. Detects motion/activity in the video
        2. Groups consecutive active frames into deliveries
        3. Splits deliveries based on gaps in activity

        For MVP, we'll use motion detection. In production, you could
        train a model to detect the bowler's run-up start.

        Args:
            video_path: Path to video file
            min_gap_seconds: Minimum gap between deliveries (seconds)

        Returns:
            List of delivery segments with start/end frames and times
        """
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        min_gap_frames = int(min_gap_seconds * fps)

        segments = []
        prev_frame = None
        motion_frames = []

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Convert to grayscale and blur
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if prev_frame is not None:
                # Calculate frame difference (motion detection)
                frame_diff = cv2.absdiff(prev_frame, gray)
                thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)[1]

                # Dilate to fill gaps
                thresh = cv2.dilate(thresh, None, iterations=2)

                # Calculate motion intensity
                motion_intensity = np.sum(thresh) / (thresh.shape[0] * thresh.shape[1])

                # Threshold for significant motion (adjust based on testing)
                if motion_intensity > 20:  # Adjust this threshold
                    motion_frames.append(frame_idx)

            prev_frame = gray
            frame_idx += 1

            # Progress indicator (every 100 frames)
            if frame_idx % 100 == 0:
                print(f"  Processed {frame_idx} frames...")

        cap.release()

        # Group motion frames into deliveries (based on gaps)
        if motion_frames:
            current_segment_start = motion_frames[0]
            current_segment_end = motion_frames[0]

            for i in range(1, len(motion_frames)):
                if motion_frames[i] - motion_frames[i-1] > min_gap_frames:
                    # Gap detected - save current segment
                    if current_segment_end - current_segment_start > fps * 2:  # At least 2 seconds
                        segments.append({
                            'start_frame': current_segment_start,
                            'end_frame': current_segment_end,
                            'start_time': current_segment_start / fps,
                            'end_time': current_segment_end / fps
                        })

                    # Start new segment
                    current_segment_start = motion_frames[i]
                    current_segment_end = motion_frames[i]
                else:
                    # Continue current segment
                    current_segment_end = motion_frames[i]

            # Save last segment
            if current_segment_end - current_segment_start > fps * 2:
                segments.append({
                    'start_frame': current_segment_start,
                    'end_frame': current_segment_end,
                    'start_time': current_segment_start / fps,
                    'end_time': current_segment_end / fps
                })

        return segments

    def extract_frames(self, video_path, start_frame, end_frame):
        """
        Extract frames from a video segment

        Args:
            video_path: Path to video file
            start_frame: Starting frame index
            end_frame: Ending frame index

        Returns:
            List of frames (numpy arrays)
        """
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        frames = []
        current_frame = start_frame

        while current_frame <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            frames.append(frame)
            current_frame += 1

        cap.release()

        return frames
