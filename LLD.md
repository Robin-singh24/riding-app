# Low Level Design — GoComet Ride Hailing Platform

---

## 1. System Architecture

The system follows a **Modular Monolith** pattern with clear service boundaries.

```
Client (React)
    │
    ├── REST API (HTTP)
    │       │
    │       ▼
    │   Express Server
    │       │
    │       ├── Middleware (Helmet, CORS, Compression, Zod Validation)
    │       │
    │       ├── Controller Layer    ← request/response handling
    │       │       │
    │       ├── Service Layer       ← business logic, orchestration
    │       │       │
    │       ├── Repository Layer    ← database access, query abstraction
    │       │       │
    │       ├── PostgreSQL          ← persistent transactional data
    │       │
    │       └── Redis               ← driver locations, ride timeout tracking
    │
    └── Socket.IO (WebSocket)
            │
            └── Real-time notifications (ride events, payment updates)
```

Each module (ride, driver, trip, payment) owns its own Controller, Service, Repository, DTO, and Validation files. No cross-module repository access — services communicate through well-defined interfaces.

---

## 2. Database Schema

### 2.1 Entity Relationship

```
┌──────────┐       1:1       ┌────────────────┐
│   User   │────────────────▶│ DriverProfile   │
│          │                 │                 │
│ id (PK)  │                 │ userId (PK, FK) │
│ fullName │                 │ vehicleNumber   │
│ email    │                 │ vehicleType     │
│ password │                 │ licenseNumber   │
│ role     │                 │ status          │
└──────────┘                 │ rating          │
     │                       └─────────────────┘
     │
     │  1:N (as rider)          1:N (as driver)
     │
     ▼
┌──────────────────┐       1:1       ┌─────────────┐
│      Ride        │────────────────▶│   Payment   │
│                  │                 │             │
│ id (PK)          │                 │ id (PK)     │
│ riderId (FK)     │                 │ rideId (FK) │
│ driverId (FK)    │                 │ amount      │
│ pickupLat/Lng    │                 │ method      │
│ destLat/Lng      │                 │ status      │
│ fare             │                 │ txnId       │
│ surgeMultiplier  │                 └─────────────┘
│ status           │
│ idempotencyKey   │
│ requestedAt      │
│ startedAt        │
│ endedAt          │
└──────────────────┘
```

### 2.2 Indexes

| Table | Index | Purpose |
|---|---|---|
| User | `email` (unique) | Login lookup |
| DriverProfile | `status` | Filter online drivers |
| Ride | `idempotencyKey` (unique) | Idempotent ride creation |
| Ride | `status` | Ride lifecycle queries |
| Ride | `riderId` | Rider's ride history |
| Ride | `driverId` | Driver's ride history |
| Ride | `[riderId, status]` (composite) | Active ride check for rider |
| Ride | `[driverId, status]` (composite) | Active ride check for driver |
| Payment | `rideId` (unique) | One payment per ride |
| Payment | `transactionId` (unique) | PSP deduplication |

### 2.3 Enums

```
Role:          RIDER | DRIVER
DriverStatus:  ONLINE | OFFLINE | ON_TRIP
RideStatus:    SEARCHING | ASSIGNED | STARTED | COMPLETED | CANCELLED
PaymentStatus: PENDING | PROCESSING | SUCCESS | FAILED
PaymentMethod: CASH | CARD | UPI
```

---

## 3. Ride Lifecycle State Machine

```
    Rider requests ride
           │
           ▼
      ┌──────────┐
      │ SEARCHING │──────────────────────────────┐
      └────┬──────┘                              │
           │                                     │
    Driver accepts                    Timeout (60s) or
           │                        all drivers decline
           ▼                                     │
      ┌──────────┐                               ▼
      │ ASSIGNED  │                        ┌───────────┐
      └────┬──────┘                        │ CANCELLED │
           │                               └───────────┘
    Driver starts trip
           │
           ▼
      ┌──────────┐
      │ STARTED   │
      └────┬──────┘
           │
    Driver ends trip
    (fare recalculated)
           │
           ▼
      ┌──────────┐
      │ COMPLETED │
      └──────────┘
           │
    Rider pays
           │
           ▼
      Payment (PENDING → SUCCESS/FAILED)
```

### State Transition Guards

| From | To | Guard Condition |
|---|---|---|
| SEARCHING | ASSIGNED | `updateMany` with `WHERE status=SEARCHING AND driverId IS NULL` (optimistic lock) |
| SEARCHING | CANCELLED | Timeout expiry OR all notified drivers declined |
| ASSIGNED | STARTED | `WHERE status=ASSIGNED`, sets `startedAt` |
| STARTED | COMPLETED | `WHERE status=STARTED`, recalculates fare with surge, sets `endedAt` |

Invalid transitions throw `ApiError(400)`. Concurrent assignment attempts throw `ApiError(409)`.

---

## 4. API Design

### 4.1 Endpoints

```
POST   /v1/rides                    Create ride request
GET    /v1/rides/:id                Get ride status

POST   /v1/drivers/:id/location     Update driver GPS
POST   /v1/drivers/:id/accept       Accept ride offer
POST   /v1/drivers/:id/decline      Decline ride offer
GET    /v1/drivers/:id/earnings     Get driver earnings

POST   /v1/trips/:id/start          Start trip (driver picked up rider)
POST   /v1/trips/:id/end            End trip and calculate final fare

POST   /v1/payments                 Process payment for completed trip

GET    /v1/demo/users               Get seeded demo users
GET    /health                      Health check
```

### 4.2 Request/Response Flow

```
Request → Helmet/CORS/Compression → JSON Parser → Zod Validation → Controller → Service → Repository → DB
                                                                                              │
Error at any layer → Global Error Handler → { success: false, message, errors }                │
                                                                                              │
Response ← ApiResponse({ success: true, message, data }) ◄───────────────────────────────────┘
```

### 4.3 Idempotency

**Ride Creation:** Client sends `Idempotency-Key` header (UUID). Service checks for existing ride with that key before creating. DB has unique constraint as safety net.

**Payment Creation:** Service checks `findPaymentByRideId` before creating. DB has unique constraint on `rideId`.

### 4.4 Validation

All inputs validated via Zod schemas that parse `{ body, params, query }`. Failures return `400` with structured error issues. Examples:

- Latitude: `z.number().min(-90).max(90)`
- UUIDs: `z.uuid()` on all ID fields
- Enums: `z.enum(["CASH", "CARD", "UPI"])`

---

## 5. Redis Data Structures

### 5.1 Driver Locations

```
Key:    drivers:locations (Geo Set)
Value:  driverId → (longitude, latitude)

Commands:
  GEOADD   drivers:locations <lng> <lat> <driverId>     ← location update
  GEORADIUS drivers:locations <lng> <lat> 5 km ASC      ← nearby search
  ZREM     drivers:locations <driverId>                  ← remove on trip accept
  ZCARD    drivers:locations                             ← count for surge calc
```

### 5.2 Ride Timeout Tracking

```
Key:    rides:pending (Sorted Set)
Score:  expiry timestamp (Date.now() + 60000)
Value:  rideId

Key:    ride:drivers:<rideId> (String, TTL 60s)
Value:  JSON array of notified driver IDs

Commands:
  ZADD           rides:pending <expiresAt> <rideId>      ← track new ride
  ZRANGEBYSCORE  rides:pending -inf <now>                 ← find expired rides
  ZREM           rides:pending <rideId>                   ← cleanup on accept/cancel
  SET            ride:drivers:<rideId> <json> EX 60       ← track notified drivers
  GET            ride:drivers:<rideId>                    ← check who was notified
```

---

## 6. Concurrency Handling

### 6.1 Driver Assignment Race Condition

Multiple drivers may try to accept the same ride simultaneously.

**Solution:** `updateMany` with conditional WHERE clause inside a transaction:

```sql
UPDATE "Ride"
SET "driverId" = $1, "status" = 'ASSIGNED'
WHERE "id" = $2 AND "status" = 'SEARCHING' AND "driverId" IS NULL
```

Returns `count = 1` if successful, `count = 0` if another driver already took it. Loser gets `409 Conflict`.

### 6.2 Transaction Boundaries

| Operation | Scope | Why |
|---|---|---|
| Accept Ride | Ride assignment + Driver status → ON_TRIP | Both must succeed or neither |
| End Trip | Ride completion + Driver status → ONLINE | Prevent driver stuck in ON_TRIP |
| Payment | Payment status + transaction ID update | Consistent payment state |

---

## 7. Surge Pricing

### 7.1 Algorithm

```
ratio = activeRides / availableDrivers

Tiers:
  ratio < 0.5  → 1.0x  (no surge)
  ratio < 1.0  → 1.25x
  ratio < 1.5  → 1.5x
  ratio < 2.0  → 2.0x
  ratio ≥ 2.0  → 2.5x  (max surge)

If availableDrivers = 0 → max surge (2.5x)
```

### 7.2 Data Sources

- `activeRides`: Postgres count of rides with status IN (SEARCHING, ASSIGNED, STARTED)
- `availableDrivers`: Redis ZCARD on `drivers:locations`

### 7.3 Fare Calculation

```
distance = haversine(pickup, destination)
fare = (BASE_FARE + distance × PER_KM_RATE) × surgeMultiplier
     = (50 + distance × 12) × surgeMultiplier
```

Surge multiplier is stored on the Ride record at creation time and reused at trip completion to ensure the rider pays the quoted price.

---

## 8. Real-Time Communication

### 8.1 Socket.IO Events

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `rider:join` | Client → Server | `{ riderId }` | Rider connects |
| `driver:join` | Client → Server | `{ driverId }` | Driver connects |
| `ride:requested` | Server → Driver | Ride object | New ride created |
| `ride:assigned` | Server → Rider | Ride object | Driver accepts |
| `ride:cancelled` | Server → Rider | Ride object | Timeout or all decline |
| `trip:started` | Server → Rider | Ride object | Driver starts trip |
| `trip:ended` | Server → Rider | Ride object | Driver ends trip |
| `payment:completed` | Server → Rider | Payment object | Payment processed |

### 8.2 Room Strategy

Each user joins a room named `rider:<id>` or `driver:<id>` on connection. Server emits to the specific room — no broadcasting, no fan-out waste.

---

## 9. Payment Processing

### 9.1 Flow

```
POST /v1/payments { rideId }
        │
        ├── Validate ride exists and status = COMPLETED
        ├── Check for existing payment (idempotency)
        ├── Create Payment record (status: PENDING)
        ├── Call PSP provider.processPayment()
        ├── Update Payment (status: SUCCESS/FAILED, transactionId)
        └── Notify rider via Socket.IO
```

### 9.2 PSP Abstraction

```
PspProvider (interface)
    ├── processPayment(paymentId, amount) → PaymentResult
    │
    └── MockPspProvider (implementation)
            ├── 500ms simulated latency
            └── 95% success rate
```

Factory pattern (`PspFactory.getProvider()`) allows swapping to Razorpay/Stripe without touching service code.

---

## 10. Background Workers

### Ride Timeout Worker

```
Interval:  every 10 seconds
Logic:
  1. ZRANGEBYSCORE rides:pending -inf <now>  → expired ride IDs
  2. For each expired ride:
     a. Fetch ride from DB
     b. If status ≠ SEARCHING → cleanup Redis, skip
     c. Update ride status → CANCELLED (with WHERE status=SEARCHING guard)
     d. Remove from Redis (sorted set + driver list key)
     e. Notify rider via ride:cancelled socket event
```

Lifecycle: starts on server boot, stops on graceful shutdown (SIGINT/SIGTERM).

---

## 11. Error Handling

### 11.1 Error Hierarchy

```
Global Error Handler
    │
    ├── ApiError (custom)     → status code + message
    ├── ZodError (validation) → 400 + structured issues
    └── Unknown               → 500 + "Internal Server Error"
```

### 11.2 Response Format

```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "message": "...", "errors": null | [...] }
```

---

## 12. Monitoring

New Relic APM auto-instrumentation captures:

- API response times per endpoint
- Database query performance (Prisma queries)
- Transaction traces for slow requests
- Error rates and throughput
- Apdex score

Integrated via `import "newrelic"` at server entry point before any other imports.

---

## 13. Security

- **Helmet** — HTTP security headers (XSS, clickjacking, MIME sniffing)
- **CORS** — cross-origin request control
- **Compression** — gzip response compression
- **Input validation** — Zod on every endpoint
- **Parameterized queries** — Prisma ORM prevents SQL injection
- **Passwords** — bcrypt hashed in seed data
- **Environment variables** — sensitive config via dotenv

---

## 14. Project Structure

```
backend/src/
├── config/
│   ├── env.ts              Zod-validated environment variables
│   ├── prisma.ts           Prisma client singleton
│   ├── redis.ts            Redis client + geo/timeout helpers
│   └── logger.ts           Pino logger
├── middleware/
│   ├── validate.ts         Zod schema validation middleware
│   ├── errorHandler.ts     Global error handler
│   └── notFound.ts         404 handler
├── modules/
│   ├── ride/
│   │   ├── ride.controller.ts
│   │   ├── ride.service.ts
│   │   ├── ride.repository.ts
│   │   ├── ride.dto.ts
│   │   ├── ride.validation.ts
│   │   ├── ride.routes.ts
│   │   ├── fareCalculator.ts
│   │   └── surgeCalculator.ts
│   ├── driver/              (same pattern)
│   ├── trip/                (same pattern)
│   ├── payment/             (same pattern)
│   └── demo/                (same pattern)
├── psp/
│   ├── psp.interface.ts     PSP contract
│   ├── mockPspProvider.ts   Mock implementation
│   └── pspFactory.ts        Provider factory
├── socket/
│   ├── socket.ts            Socket.IO initialization
│   └── index.ts             Event emitters
├── workers/
│   └── rideTimeout.worker.ts
├── utils/
│   ├── ApiError.ts
│   ├── ApiResponse.ts
│   └── asyncHandler.ts
├── app.ts                   Express app setup
└── server.ts                Entry point
```
