import numpy as np

class InsightsGenerator:
    """
    Generate coaching insights by correlating bowling action with ball outcomes
    """

    def __init__(self, db):
        self.db = db

    def generate_insights(self, session_id, bowler_id):
        """
        Generate coaching insights for a session

        Args:
            session_id: Session UUID
            bowler_id: Bowler UUID

        Returns:
            List of generated insights
        """
        insights = []

        # Get all deliveries for this session
        deliveries = self.db.get_deliveries_for_session(session_id)

        if not deliveries or len(deliveries) == 0:
            return insights

        # Get bowler's average metrics (for consistency analysis)
        bowler_avg = self.db.get_bowler_average_metrics(bowler_id)

        # Analyze speed variation
        speeds = [d['release_speed_kmh'] for d in deliveries if d['release_speed_kmh']]
        if len(speeds) > 0:
            avg_speed = np.mean(speeds)
            speed_std = np.std(speeds)

            if speed_std > 5:  # High variation
                insights.append({
                    'type': 'action_flaw',
                    'severity': 'medium',
                    'title': 'Inconsistent pace',
                    'description': f'Speed varies by {speed_std:.1f} km/h (avg: {avg_speed:.1f} km/h)',
                    'impact': 'Inconsistent pace makes you predictable to batsmen',
                    'recommendation': 'Focus on consistent run-up and release point',
                    'delivery_ids': [d['id'] for d in deliveries]
                })

        # Analyze no-balls
        no_balls = [d for d in deliveries if d.get('no_ball')]
        if len(no_balls) > 0:
            no_ball_rate = len(no_balls) / len(deliveries) * 100

            insights.append({
                'type': 'action_flaw',
                'severity': 'high',
                'title': f'{len(no_balls)} no-balls in session',
                'description': f'{no_ball_rate:.0f}% no-ball rate - front foot over crease',
                'impact': 'Gives away free runs and extra deliveries',
                'recommendation': 'Mark your run-up precisely, adjust landing position',
                'delivery_ids': [d['id'] for d in no_balls]
            })

        # Analyze elbow extension (potential chucking)
        elbows = [d['elbow_extension_degrees'] for d in deliveries
                 if d.get('elbow_extension_degrees')]

        if len(elbows) > 0:
            max_elbow = max(elbows)

            if max_elbow > 15:
                insights.append({
                    'type': 'action_flaw',
                    'severity': 'high',
                    'title': 'Illegal bowling action detected',
                    'description': f'Elbow extension up to {max_elbow:.1f}° (limit: 15°)',
                    'impact': 'Action may be called illegal in matches',
                    'recommendation': 'Work with coach on arm straightness at release',
                    'delivery_ids': [d['id'] for d in deliveries
                                   if d.get('elbow_extension_degrees', 0) > 15]
                })

        # Analyze delivery type distribution
        delivery_types = [d['delivery_type'] for d in deliveries if d.get('delivery_type')]

        if len(delivery_types) > 0:
            unique_types = set(delivery_types)

            if len(unique_types) == 1:
                insights.append({
                    'type': 'strength',
                    'severity': 'low',
                    'title': 'Limited delivery variety',
                    'description': f'All deliveries were {delivery_types[0]}',
                    'impact': 'Batsmen can predict your length',
                    'recommendation': 'Practice varying your length - yorkers, bouncers, good length',
                    'delivery_ids': [d['id'] for d in deliveries]
                })

        # Analyze consistency score
        consistency_scores = [d['consistency_score'] for d in deliveries
                            if d.get('consistency_score')]

        if len(consistency_scores) > 0:
            avg_consistency = np.mean(consistency_scores)

            if avg_consistency < 0.7:
                insights.append({
                    'type': 'action_flaw',
                    'severity': 'medium',
                    'title': 'Inconsistent bowling action',
                    'description': f'Action consistency score: {avg_consistency:.2f} (target: >0.8)',
                    'impact': 'Inconsistent action leads to wayward deliveries',
                    'recommendation': 'Video analysis of your action - identify variations',
                    'delivery_ids': [d['id'] for d in deliveries]
                })
            elif avg_consistency > 0.85:
                insights.append({
                    'type': 'strength',
                    'severity': 'low',
                    'title': 'Excellent action consistency',
                    'description': f'Consistent action across all deliveries ({avg_consistency:.2f})',
                    'impact': 'Repeatable action builds reliability',
                    'recommendation': 'Maintain this consistency in match situations',
                    'delivery_ids': [d['id'] for d in deliveries]
                })

        # Correlate action to outcome (advanced analysis)
        self.analyze_action_outcome_correlation(deliveries, insights)

        # Save insights to database
        for insight in insights:
            self.db.insert_insight(
                bowler_id=bowler_id,
                session_id=session_id,
                insight_type=insight['type'],
                severity=insight['severity'],
                title=insight['title'],
                description=insight['description'],
                impact=insight['impact'],
                recommendation=insight['recommendation'],
                delivery_ids=insight.get('delivery_ids')
            )

        return insights

    def analyze_action_outcome_correlation(self, deliveries, insights):
        """
        Analyze correlation between action flaws and ball outcomes

        This is the "magic" - linking biomechanics to results
        """
        # Group deliveries by action characteristics

        # Example: Shoulder rotation vs delivery type
        side_on_deliveries = [d for d in deliveries
                             if d.get('action_type') == 'side_on']
        front_on_deliveries = [d for d in deliveries
                              if d.get('action_type') == 'front_on']

        if side_on_deliveries and front_on_deliveries:
            side_on_speed = np.mean([d['release_speed_kmh'] for d in side_on_deliveries
                                    if d['release_speed_kmh']])
            front_on_speed = np.mean([d['release_speed_kmh'] for d in front_on_deliveries
                                     if d['release_speed_kmh']])

            if abs(side_on_speed - front_on_speed) > 5:
                faster_action = 'side_on' if side_on_speed > front_on_speed else 'front_on'

                insights.append({
                    'type': 'trend',
                    'severity': 'low',
                    'title': f'{faster_action.replace("_", "-")} action generates more pace',
                    'description': f'Side-on: {side_on_speed:.1f} km/h, Front-on: {front_on_speed:.1f} km/h',
                    'impact': 'Action type affects your pace generation',
                    'recommendation': f'Work on {faster_action.replace("_", "-")} technique for faster deliveries',
                    'delivery_ids': [d['id'] for d in deliveries]
                })

        # Example: Release height vs bounce
        deliveries_with_height = [d for d in deliveries
                                 if d.get('release_height_m') and d.get('bounce_point_m')]

        if len(deliveries_with_height) > 3:
            heights = [d['release_height_m'] for d in deliveries_with_height]
            bounces = [d['bounce_point_m'] for d in deliveries_with_height]

            # Simple correlation
            correlation = np.corrcoef(heights, bounces)[0, 1]

            if abs(correlation) > 0.5:
                if correlation > 0:
                    insights.append({
                        'type': 'trend',
                        'severity': 'low',
                        'title': 'Higher release = fuller length',
                        'description': f'Release height correlates with pitch position (r={correlation:.2f})',
                        'impact': 'Adjust release height to control length',
                        'recommendation': 'Lower release point for shorter deliveries',
                        'delivery_ids': [d['id'] for d in deliveries_with_height]
                    })

        # TODO: More sophisticated correlations
        # - Shoulder drop → short deliveries
        # - Front arm timing → speed
        # - Stride length → accuracy
