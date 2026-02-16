# Multi-Region Property Listing Backend with NGINX, PostgreSQL, and Kafka

A production-ready distributed backend system that demonstrates advanced concepts in multi-region architecture, including load balancing, asynchronous replication, and conflict resolution using optimistic locking.

## Project Overview

This project builds a **property listing backend** that simulates two geographic regions (US and EU). It showcases:

- **Reverse Proxy & Load Balancing** using NGINX
- **Multi-region Data Synchronization** via Kafka
- **Optimistic Locking** for conflict prevention
- **Idempotency** to handle retry requests safely
- **Failover Mechanisms** for high availability
- **Docker Containerization** for easy deployment

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NGINX Proxy                      │
│                   (Port 8080)                       │
│         Routes: /us/* -> backend-us                │
│         Routes: /eu/* -> backend-eu                │
└─────────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│   backend-us     │        │   backend-eu     │
│  (Port 8000)     │        │  (Port 8000)     │
└──────────────────┘        └──────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│   PostgreSQL-US  │        │  PostgreSQL-EU   │
│  (Port 5432)     │        │  (Port 5432)     │
└──────────────────┘        └──────────────────┘
         │                            │
         └─────────┬──────────────────┘
                   ▼
           ┌───────────────┐
           │     Kafka     │
           │   (Port 9092) │
           │  Topic: property-updates
           └───────────────┘
```

## Tech Stack

- **Load Balancer**: NGINX (reverse proxy with failover)
- **Backend**: Node.js with Express
- **Databases**: PostgreSQL (dual-region)
- **Message Broker**: Kafka with Zookeeper
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest integration tests

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 16+ (for local development)
- PostgreSQL client tools (optional, for manual testing)

### Installation & Running

```bash
# Clone the repository
git clone <repo-url>
cd Build-a-Multi-Region-Property-Listing-Backend-with-NGINX-PostgreSQL-and-Kafka

# Start all services
docker-compose up -d

# Wait for containers to become healthy (about 2-3 minutes)
docker-compose ps

# Verify setup
curl http://localhost:8080/us/health
curl http://localhost:8080/eu/health
```

## Project Structure

```
.
├── nginx/
│   └── nginx.conf              # Reverse proxy configuration
├── src/
│   ├── index.js                # Main Express application
│   ├── package.json            # Node.js dependencies
│   └── Dockerfile              # Backend container image
├── seeds/
│   └── init.sql                # Database schema & sample data
├── tests/
│   ├── demonstrate_failover.sh # Failover test script
│   └── req-optimistic-locking.test.js  # Integration tests
├── .env.example                # Environment configuration template
├── docker-compose.yml          # Container orchestration
└── README.md                   # This file
```

## Core Features

### 1. NGINX Reverse Proxy
- Routes requests based on URL paths
- Implements failover between regions
- Custom access logs with upstream response times
- Health checks on backend services

### 2. Multi-Region Backends
- Express REST API for property management
- Optimistic locking for concurrent updates
- Kafka producer for publishing updates
- Kafka consumer for receiving remote updates
- Idempotency store to prevent duplicate operations

### 3. Database Schema

```sql
CREATE TABLE properties (
  id BIGINT PRIMARY KEY,
  price DECIMAL(12, 2) NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  region_origin VARCHAR(2) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4. API Endpoints

#### Health Check
```bash
GET /us/health
GET /eu/health
```

#### Get Property
```bash
GET /{region}/properties/{id}
```

#### Update Property (with Optimistic Locking)
```bash
PUT /{region}/properties/{id}
Content-Type: application/json
X-Request-ID: unique-request-id (optional, for idempotency)

{
  "price": 520000,
  "version": 1
}
```

#### Check Replication Lag
```bash
GET /{region}/replication-lag
```

## Key Implementation Details

### Optimistic Locking
Each property has a `version` field. When updating:
- Client sends current version in request
- Server checks if version matches database
- If mismatch: returns 409 Conflict
- If match: increments version and updates record

### Idempotency
- Uses `X-Request-ID` header for tracking
- Stores processed request IDs in memory
- Duplicate requests return 422 Unprocessable Entity
- Prevents accidental double-charges or duplicate operations

### Asynchronous Replication
- When a region updates a property, it publishes to Kafka
- Other regions consume updates via Kafka consumer
- Updates are applied to local database only if from different region
- Maintains eventual consistency across regions

### Failover Mechanism
- NGINX monitors backend health via configured health checks
- If primary region fails, traffic automatically reroutes to backup region
- Minimizes downtime in case of regional outages

## Testing

### Run Integration Tests
```bash
npm install
npm test
```

### Run Failover Demonstration
```bash
bash tests/demonstrate_failover.sh
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=db-us  # or db-eu for EU region
DB_PORT=5432
DB_NAME=property_db
KAFKA_BROKER=kafka:29092
KAFKA_TOPIC=property-updates
REGION=us      # or eu
PORT=8000
NODE_ENV=production
```

## Monitoring & Debugging

### View Logs
```bash
# NGINX logs
docker logs nginx_proxy

# Backend logs
docker logs backend-us
docker logs backend-eu

# Database logs
docker logs db-us
```

### Access Databases
```bash
psql -h localhost -U postgres -d property_db
```

## Performance Considerations

- **Connection Pooling**: PostgreSQL uses connection pools for efficiency
- **Kafka Batching**: Messages are batched for throughput
- **Caching**: Consider adding Redis for frequently accessed properties
- **Database Indexes**: Indexes on region_origin and updated_at for fast queries

## Security Best Practices

- Environment variables for sensitive data (not in code)
- No hardcoded credentials in docker-compose.yml
- NGINX restricts access to health endpoints
- Input validation on API requests
- Database constraints prevent invalid data

## Troubleshooting

**Containers not starting?**
- Check Docker is running: `docker ps`
- Review logs: `docker-compose logs`
- Ensure ports 8080, 5432, 9092 are available

**Database connection errors?**
- Wait for PostgreSQL to be ready (health check)
- Verify environment variables in .env
- Check network connectivity between containers

**Failover not working?**
- Verify NGINX configuration
- Check health check endpoints respond correctly
- Review NGINX error logs

## Future Enhancements

- [ ] Redis caching layer for performance
- [ ] GraphQL API alongside REST
- [ ] Advanced conflict resolution (automatic merge)
- [ ] Multi-region read replicas
- [ ] Metrics collection with Prometheus
- [ ] Distributed tracing with Jaeger

## Learning Outcomes

This project demonstrates:
- Distributed system design patterns
- Conflict resolution in eventually consistent systems
- Reverse proxy & load balancing
- Event-driven architecture with Kafka
- Docker containerization best practices
- Testing strategies for distributed systems

## References

- NGINX Reverse Proxy: https://nginx.org/en/docs/
- PostgreSQL Optimistic Locking: https://en.wikipedia.org/wiki/Optimistic_concurrency_control
- Kafka Architecture: https://kafka.apache.org/documentation/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/

## License

MIT License - Feel free to use this project for learning and development.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Author**: Partnr Global Placement Program  
**Last Updated**: February 2026
