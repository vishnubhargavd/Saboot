.PHONY: all start dev admin expo stop clean test help

# Default target
all: start

# Extract active LAN IP address on macOS / Linux
LAN_IP := $(shell ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}' || echo "127.0.0.1")

help:
	@echo "Saboot - Make Commands:"
	@echo "  make start (or make dev)  - Start both Admin Server & Expo with QR code"
	@echo "  make admin                - Run only the Admin Operations Console"
	@echo "  make expo                 - Run only the Expo Metro Bundler with QR code"
	@echo "  make test                 - Run the end-to-end verification test suite"
	@echo "  make stop                 - Stop any running services on ports 3000 & 8081"

start: dev

dev:
	@echo ""
	@echo "=========================================================="
	@echo "🚀  STARTING SABOOT PLATFORM"
	@echo "=========================================================="
	@echo "🖥️   Admin Operations Portal:  http://localhost:3000"
	@echo "🌐  Admin Network URL:        http://$(LAN_IP):3000"
	@echo "📱  Expo Metro URL:           exp://$(LAN_IP):8081"
	@echo "=========================================================="
	@echo ""
	@# Clean up any stale process on port 3000
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@# Launch admin server in background and forward Ctrl+C cleanup
	@node admin/server.js & \
	ADMIN_PID=$$!; \
	trap 'kill -9 $$ADMIN_PID 2>/dev/null || true; echo ""; echo "Stopped Saboot services."; exit 0' INT TERM EXIT; \
	sleep 1.2; \
	echo "Launching Expo Metro Bundler (Scan QR code with Expo Go)..."; \
	echo ""; \
	npx expo start

admin:
	@echo "Starting Saboot Admin Server on port 3000..."
	@echo "Local:   http://localhost:3000"
	@echo "Network: http://$(LAN_IP):3000"
	@node admin/server.js

expo:
	@echo "Starting Expo Metro Bundler..."
	@npx expo start

test:
	@node tests/testGeocodingAndTelemetry.js
	@node tests/runTests.js
	@node tests/testOvertureAndDispatchSync.js
	@node tests/verifyPhoneToDbToAdmin.js
	@node tests/testCompleteFlow.js

stop:
	@echo "Stopping Saboot services on ports 3000 and 8081..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✓ Stopped Admin Server (port 3000)" || echo "• No service on port 3000"
	@lsof -ti:8081 | xargs kill -9 2>/dev/null && echo "✓ Stopped Metro / Expo (port 8081)" || echo "• No service on port 8081"
	@echo "All services stopped."
