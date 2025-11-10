const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/vr/bowlers/:id/deliveries - Get VR-formatted delivery data
router.get('/bowlers/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, delivery_type, min_speed, max_speed } = req.query;

    let queryText = `
      SELECT
        d.id,
        d.delivery_number,
        d.trajectory,
        d.release_speed_kmh,
        d.bounce_point_m,
        d.bounce_height_m,
        d.swing_movement_mm,
        d.delivery_type,
        d.line,
        ba.pose_sequence,
        ba.release_height_m,
        ba.action_type,
        s.session_date
      FROM deliveries d
      LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
      LEFT JOIN sessions s ON s.id = d.session_id
      WHERE d.bowler_id = $1
        AND d.trajectory IS NOT NULL
    `;
    const params = [id];
    let paramCount = 2;

    if (delivery_type) {
      queryText += ` AND d.delivery_type = $${paramCount}`;
      params.push(delivery_type);
      paramCount++;
    }

    if (min_speed) {
      queryText += ` AND d.release_speed_kmh >= $${paramCount}`;
      params.push(parseFloat(min_speed));
      paramCount++;
    }

    if (max_speed) {
      queryText += ` AND d.release_speed_kmh <= $${paramCount}`;
      params.push(parseFloat(max_speed));
      paramCount++;
    }

    queryText += ` ORDER BY s.session_date DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await query(queryText, params);

    // Format for VR (Unity-compatible JSON)
    const vrData = result.rows.map(delivery => ({
      id: delivery.id,
      deliveryNumber: delivery.delivery_number,
      date: delivery.session_date,
      ball: {
        trajectory: delivery.trajectory,
        speed: delivery.release_speed_kmh,
        bouncePoint: delivery.bounce_point_m,
        bounceHeight: delivery.bounce_height_m,
        swing: delivery.swing_movement_mm,
        type: delivery.delivery_type,
        line: delivery.line
      },
      bowlerAction: delivery.pose_sequence ? {
        poseSequence: delivery.pose_sequence,
        releaseHeight: delivery.release_height_m,
        actionType: delivery.action_type
      } : null
    }));

    res.json({
      bowlerId: id,
      deliveries: vrData,
      count: vrData.length
    });
  } catch (error) {
    console.error('Get VR deliveries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vr/playlists - List VR playlists
router.get('/playlists', async (req, res) => {
  try {
    const { bowler_id } = req.query;

    let queryText = `
      SELECT p.*, b.name as bowler_name, u.email as coach_email
      FROM vr_playlists p
      LEFT JOIN bowlers b ON b.id = p.bowler_id
      LEFT JOIN users u ON u.id = p.coach_id
      WHERE 1=1
    `;
    const params = [];

    if (bowler_id) {
      queryText += ' AND p.bowler_id = $1';
      params.push(bowler_id);
    }

    queryText += ' ORDER BY p.created_at DESC';

    const result = await query(queryText, params);

    res.json({ playlists: result.rows });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vr/playlists/:id - Get playlist by ID (with deliveries)
router.get('/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get playlist
    const playlistResult = await query(`
      SELECT p.*, b.name as bowler_name
      FROM vr_playlists p
      LEFT JOIN bowlers b ON b.id = p.bowler_id
      WHERE p.id = $1
    `, [id]);

    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = playlistResult.rows[0];

    // Get deliveries (in order specified by delivery_ids array)
    if (playlist.delivery_ids && playlist.delivery_ids.length > 0) {
      const deliveriesResult = await query(`
        SELECT
          d.id,
          d.delivery_number,
          d.trajectory,
          d.release_speed_kmh,
          d.delivery_type,
          d.line,
          ba.pose_sequence
        FROM deliveries d
        LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
        WHERE d.id = ANY($1)
      `, [playlist.delivery_ids]);

      // Sort deliveries by the order in delivery_ids array
      const deliveryMap = {};
      deliveriesResult.rows.forEach(d => {
        deliveryMap[d.id] = d;
      });

      playlist.deliveries = playlist.delivery_ids
        .map(id => deliveryMap[id])
        .filter(d => d !== undefined);
    } else {
      playlist.deliveries = [];
    }

    res.json({ playlist });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vr/playlists - Create new playlist
router.post('/playlists', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { bowler_id, name, description, delivery_ids, difficulty, focus_area } = req.body;

    if (!bowler_id || !name || !delivery_ids || delivery_ids.length === 0) {
      return res.status(400).json({ error: 'Bowler ID, name, and delivery IDs are required' });
    }

    const result = await query(
      `INSERT INTO vr_playlists (coach_id, bowler_id, name, description, delivery_ids, difficulty, focus_area)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, bowler_id, name, description, delivery_ids, difficulty, focus_area]
    );

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: result.rows[0]
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/vr/playlists/:id - Update playlist
router.put('/playlists/:id', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, delivery_ids, difficulty, focus_area } = req.body;

    const result = await query(
      `UPDATE vr_playlists
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           delivery_ids = COALESCE($3, delivery_ids),
           difficulty = COALESCE($4, difficulty),
           focus_area = COALESCE($5, focus_area)
       WHERE id = $6
       RETURNING *`,
      [name, description, delivery_ids, difficulty, focus_area, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({
      message: 'Playlist updated successfully',
      playlist: result.rows[0]
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/vr/playlists/:id - Delete playlist
router.delete('/playlists/:id', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM vr_playlists WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
