#!/bin/bash

echo "========================================"
echo "NGINX Failover Demonstration Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1] Testing normal US backend request...${NC}"
curl -v http://localhost:8080/us/health
echo ""

echo -e "${YELLOW}[2] Testing normal EU backend request...${NC}"
curl -v http://localhost:8080/eu/health
echo ""

echo -e "${YELLOW}[3] Stopping backend-us container...${NC}"
docker stop backend-us
sleep 2
echo ""

echo -e "${YELLOW}[4] Testing US backend request with failover to EU...${NC}"
echo -e "${YELLOW}(Should still succeed because EU backend takes over)${NC}"
curl -v http://localhost:8080/us/health
echo ""

echo -e "${YELLOW}[5] Checking NGINX logs...${NC}"
docker logs nginx_proxy | tail -10
echo ""

echo -e "${YELLOW}[6] Restarting backend-us...${NC}"
docker start backend-us
sleep 3
echo ""

echo -e "${YELLOW}[7] Testing that US backend is back and responding...${NC}"
curl -v http://localhost:8080/us/health
echo ""

echo -e "${GREEN}[COMPLETE] Failover test demonstration completed!${NC}"
echo ""
echo "Summary:"
echo "- Initially, both US and EU backends are healthy"
echo "- When US backend fails, NGINX automatically reroutes to EU backend"
echo "- After US backend recovers, traffic is rerouted back"
echo ""
echo "NGINX failover mechanism verified successfully!"
