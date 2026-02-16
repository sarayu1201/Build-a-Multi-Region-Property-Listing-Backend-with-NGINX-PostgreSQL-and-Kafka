require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const region = process.env.REGION || 'us';
const port = process.env.PORT || 8000;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Kafka setup
const kafka = new Kafka({
  clientId: `app-${region}`,
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: `property-consumer-${region}` });

// Idempotency store
const idempotencyStore = new Map();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', region });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Get property
app.get('/:region/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update property with optimistic locking
app.put('/:region/properties/:id', async (req, res) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Check idempotency
  if (idempotencyStore.has(requestId)) {
    return res.status(422).json({ error: 'Duplicate request' });
  }
  
  idempotencyStore.set(requestId, true);
  
  try {
    const { id } = req.params;
    const { price, version } = req.body;
    
    const result = await pool.query(
      'UPDATE properties SET price = $1, version = version + 1, updated_at = NOW() WHERE id = $2 AND version = $3 RETURNING *',
      [price, id, version]
    );
    
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Conflict: Version mismatch' });
    }
    
    const updatedProperty = result.rows[0];
    
    // Publish to Kafka
    await producer.send({
      topic: process.env.KAFKA_TOPIC || 'property-updates',
      messages: [{
        key: id.toString(),
        value: JSON.stringify(updatedProperty),
      }],
    });
    
    res.json(updatedProperty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Replication lag endpoint
app.get('/:region/replication-lag', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT EXTRACT(EPOCH FROM (NOW() - updated_at))::FLOAT as lag_seconds FROM properties ORDER BY updated_at DESC LIMIT 1'
    );
    const lag = result.rows[0]?.lag_seconds || 0;
    res.json({ lag_seconds: parseFloat(lag.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
(async () => {
  await producer.connect();
  await consumer.connect();
  
  // Subscribe to updates from other regions
  await consumer.subscribe({ topic: process.env.KAFKA_TOPIC || 'property-updates' });
  
  await consumer.run({
    eachMessage: async ({ message }) => {
      const property = JSON.parse(message.value);
      if (property.region_origin !== region) {
        await pool.query(
          'UPDATE properties SET price = $1, version = $2, updated_at = $3 WHERE id = $4',
          [property.price, property.version, property.updated_at, property.id]
        );
      }
    },
  });
  
  app.listen(port, () => {
    console.log(`Server running on port ${port} for region ${region}`);
  });
})();

process.on('SIGINT', async () => {
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});
