const express = require('express');
const axios = require('axios');
const { query } = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/sessions - List sessions
router.get('/', async (req, res) => {
  try {
    const { bowler_id, coach_id, processed } = req.query;

    let queryText = `
      SELECT s.*, b.name as bowler_name, u.email as coach_email
      FROM sessions s
      LEFT JOIN bowlers b ON b.id = s.bowler_id
      LEFT JOIN users u ON u.id = s.coach_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (bowler_id) {
      queryText += ` AND s.bowler_id = $${paramCount}`;
      params.push(bowler_id);
      paramCount++;
    }

    if (coach_id) {
      queryText += ` AND s.coach_id = $${paramCount}`;
      params.push(coach_id);
      paramCount++;
    }

    if (processed !== undefined) {
      queryText += ` AND s.processed = $${paramCount}`;
      params.push(processed === 'true');
      paramCount++;
    }

    queryText += ' ORDER BY s.session_date DESC, s.created_at DESC';

    const result = await query(queryText, params);

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sessionResult = await query(`
      SELECT s.*, b.name as bowler_name, u.email as coach_email
      FROM sessions s
      LEFT JOIN bowlers b ON b.id = s.bowler_id
      LEFT JOIN users u ON u.id = s.coach_id
      WHERE s.id = $1
    `, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get deliveries for this session
    const deliveriesResult = await query(`
      SELECT d.*, ba.no_ball, ba.consistency_score
      FROM deliveries d
      LEFT JOIN bowling_actions ba ON ba.delivery_id = d.id
      WHERE d.session_id = $1
      ORDER BY d.delivery_number ASC
    `, [id]);

    // Get insights for this session
    const insightsResult = await query(`
      SELECT * FROM insights
      WHERE session_id = $1
      ORDER BY severity DESC, created_at DESC
    `, [id]);

    res.json({
      session: sessionResult.rows[0],
      deliveries: deliveriesResult.rows,
      insights: insightsResult.rows
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions - Create new session (upload video)
router.post('/', authorizeRole('coach', 'admin'), upload.single('video'), async (req, res) => {
  try {
    const { bowler_id, session_date, location, notes } = req.body;

    if (!bowler_id || !session_date || !req.file) {
      return res.status(400).json({ error: 'Bowler ID, session date, and video file are required' });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;

    const result = await query(
      `INSERT INTO sessions (coach_id, bowler_id, session_date, location, video_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, bowler_id, session_date, location, videoUrl, notes]
    );

    res.status(201).json({
      message: 'Session created successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { location, notes } = req.body;

    const result = await query(
      `UPDATE sessions
       SET location = COALESCE($1, location),
           notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [location, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      message: 'Session updated successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM sessions WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/process - Trigger AI processing
router.post('/:id/process', authorizeRole('coach', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get session
    const sessionResult = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Update status to processing
    await query(
      `UPDATE sessions SET processing_status = 'processing' WHERE id = $1`,
      [id]
    );

    // Call AI service (asynchronously)
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';

    // Fire and forget - don't await
    axios.post(`${aiServiceUrl}/process`, {
      session_id: id,
      video_path: session.video_url
    }).catch(error => {
      console.error('AI processing error:', error);
      query(
        `UPDATE sessions SET processing_status = 'failed', processing_error = $1 WHERE id = $2`,
        [error.message, id]
      );
    });

    res.json({
      message: 'Processing started',
      session_id: id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Process session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id/progress - Check processing progress
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT processing_status, processing_error, processed FROM sessions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
