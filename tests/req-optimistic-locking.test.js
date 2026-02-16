// Integration test for optimistic locking with concurrent updates
// Tests that simulate concurrent PUT requests to the same property from both regions

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const US_ENDPOINT = 'http://localhost:8080/us';
const EU_ENDPOINT = 'http://localhost:8080/eu';

describe('Optimistic Locking - Concurrent Updates', () => {
  let propertyId = 1;
  let version = 1;

  test('First update should succeed', async () => {
    const response = await axios.put(`${US_ENDPOINT}/properties/${propertyId}`, {
      price: 520000,
      version: version,
    });
    expect(response.status).toBe(200);
    expect(response.data.version).toBe(version + 1);
    version = response.data.version;
  });

  test('Second concurrent update with old version should fail with 409', async () => {
    try {
      await axios.put(`${US_ENDPOINT}/properties/${propertyId}`, {
        price: 530000,
        version: version - 1, // Using old version
      });
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.response.status).toBe(409);
      expect(error.response.data.error).toContain('Conflict');
    }
  });

  test('Update with correct version should succeed', async () => {
    const response = await axios.put(`${US_ENDPOINT}/properties/${propertyId}`, {
      price: 540000,
      version: version,
    });
    expect(response.status).toBe(200);
    expect(response.data.version).toBe(version + 1);
    version = response.data.version;
  });

  test('Idempotent update with same X-Request-ID should fail on retry', async () => {
    const requestId = uuidv4();
    
    // First request should succeed
    const response1 = await axios.put(
      `${US_ENDPOINT}/properties/${propertyId}`,
      { price: 550000, version: version },
      { headers: { 'X-Request-ID': requestId } }
    );
    expect(response1.status).toBe(200);
    
    // Retry with same request ID should fail with 422
    try {
      await axios.put(
        `${US_ENDPOINT}/properties/${propertyId}`,
        { price: 550000, version: version },
        { headers: { 'X-Request-ID': requestId } }
      );
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.response.status).toBe(422);
    }
  });
});
