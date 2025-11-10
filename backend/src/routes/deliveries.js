const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/deliveries - List deliveries (with filters)
router.get('/', async (req, res) => {
  try {
    const { session_id, bowler_id, delivery_type, limit = 50 } = req.query;

    let queryText = `
      SELECT d.*, ba.no_ball, ba.consistency_score, ba.action_type
      FROM deliveries d
      LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (session_id) {
      queryText += ` AND d.session_id = $${paramCount}`;
      params.push(session_id);
      paramCount++;
    }

    if (bowler_id) {
      queryText += ` AND d.bowler_id = $${paramCount}`;
      params.push(bowler_id);
      paramCount++;
    }

    if (delivery_type) {
      queryText += ` AND d.delivery_type = $${paramCount}`;
      params.push(delivery_type);
      paramCount++;
    }

    queryText += ` ORDER BY d.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await query(queryText, params);

    res.json({ deliveries: result.rows });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deliveries/:id - Get delivery by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryResult = await query(`
      SELECT d.*, s.video_url, s.session_date, b.name as bowler_name
      FROM deliveries d
      LEFT JOIN sessions s ON s.id = d.session_id
      LEFT JOIN bowlers b ON b.id = d.bowler_id
      WHERE d.id = $1
    `, [id]);

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({ delivery: deliveryResult.rows[0] });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deliveries/:id/trajectory - Get trajectory data
router.get('/:id/trajectory', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT trajectory, release_speed_kmh, bounce_point_m FROM deliveries WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get trajectory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deliveries/:id/action - Get action analysis
router.get('/:id/action', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM bowling_actions WHERE delivery_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action analysis not found' });
    }

    res.json({ action: result.rows[0] });
  } catch (error) {
    console.error('Get action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/deliveries/:id - Update delivery (manual corrections)
router.put('/:id', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_type, line } = req.body;

    const result = await query(
      `UPDATE deliveries
       SET delivery_type = COALESCE($1, delivery_type),
           line = COALESCE($2, line)
       WHERE id = $3
       RETURNING *`,
      [delivery_type, line, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({
      message: 'Delivery updated successfully',
      delivery: result.rows[0]
    });
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
