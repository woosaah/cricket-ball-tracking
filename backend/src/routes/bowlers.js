const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/bowlers - List all bowlers
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*,
             COUNT(DISTINCT s.id) as total_sessions,
             COUNT(DISTINCT d.id) as total_deliveries,
             AVG(d.release_speed_kmh) as avg_speed
      FROM bowlers b
      LEFT JOIN sessions s ON s.bowler_id = b.id
      LEFT JOIN deliveries d ON d.bowler_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);

    res.json({ bowlers: result.rows });
  } catch (error) {
    console.error('Get bowlers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bowlers/:id - Get bowler by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM bowlers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bowler not found' });
    }

    res.json({ bowler: result.rows[0] });
  } catch (error) {
    console.error('Get bowler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bowlers - Create new bowler
router.post('/', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const {
      name,
      age,
      bowling_style,
      bowling_arm,
      height_cm,
      weight_kg,
      profile_photo_url
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO bowlers (name, age, bowling_style, bowling_arm, height_cm, weight_kg, profile_photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, age, bowling_style, bowling_arm, height_cm, weight_kg, profile_photo_url]
    );

    res.status(201).json({
      message: 'Bowler created successfully',
      bowler: result.rows[0]
    });
  } catch (error) {
    console.error('Create bowler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/bowlers/:id - Update bowler
router.put('/:id', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      age,
      bowling_style,
      bowling_arm,
      height_cm,
      weight_kg,
      profile_photo_url
    } = req.body;

    const result = await query(
      `UPDATE bowlers
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           bowling_style = COALESCE($3, bowling_style),
           bowling_arm = COALESCE($4, bowling_arm),
           height_cm = COALESCE($5, height_cm),
           weight_kg = COALESCE($6, weight_kg),
           profile_photo_url = COALESCE($7, profile_photo_url)
       WHERE id = $8
       RETURNING *`,
      [name, age, bowling_style, bowling_arm, height_cm, weight_kg, profile_photo_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bowler not found' });
    }

    res.json({
      message: 'Bowler updated successfully',
      bowler: result.rows[0]
    });
  } catch (error) {
    console.error('Update bowler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/bowlers/:id - Delete bowler
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM bowlers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bowler not found' });
    }

    res.json({ message: 'Bowler deleted successfully' });
  } catch (error) {
    console.error('Delete bowler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bowlers/:id/stats - Get bowler statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Overall stats
    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(d.id) as total_deliveries,
        AVG(d.release_speed_kmh) as avg_speed,
        MAX(d.release_speed_kmh) as max_speed,
        MIN(d.release_speed_kmh) as min_speed,
        AVG(ba.consistency_score) as avg_consistency,
        COUNT(CASE WHEN ba.no_ball = true THEN 1 END) as no_balls
      FROM bowlers b
      LEFT JOIN sessions s ON s.bowler_id = b.id
      LEFT JOIN deliveries d ON d.bowler_id = b.id
      LEFT JOIN bowling_actions ba ON ba.bowler_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);

    // Delivery type distribution
    const deliveryTypesResult = await query(`
      SELECT delivery_type, COUNT(*) as count
      FROM deliveries
      WHERE bowler_id = $1 AND delivery_type IS NOT NULL
      GROUP BY delivery_type
    `, [id]);

    // Recent sessions
    const recentSessionsResult = await query(`
      SELECT id, session_date, location, processed
      FROM sessions
      WHERE bowler_id = $1
      ORDER BY session_date DESC
      LIMIT 10
    `, [id]);

    res.json({
      stats: statsResult.rows[0],
      delivery_types: deliveryTypesResult.rows,
      recent_sessions: recentSessionsResult.rows
    });
  } catch (error) {
    console.error('Get bowler stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
