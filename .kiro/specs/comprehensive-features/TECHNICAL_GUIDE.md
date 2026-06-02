# Technical Implementation Guide

## Part 1: Database & Schema

### Prisma Schema Structure

All new models follow these patterns:

```prisma
// Multi-tenant model with unique constraint
model Location {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name])  // Unique per tenant
  @@index([tenantId])          // Always index tenant
  @@map("locations")           // Snake case table name
}
```

### Key Conventions
- All timestamps: `createdAt`, `updatedAt` (camelCase in code)
- Database fields: snake_case mapping
- Primary key: `@id @default(cuid())`
- Foreign keys: Always include cascade delete for multi-tenant
- Composite indexes: `@@unique([tenantId, fieldName])`
- Always `@@index([tenantId])` for query filtering

### Creating Migrations

```bash
# From server directory
npx prisma migrate dev --name add_shifts_table

# This creates:
# - prisma/migrations/YYYYMMDDHHMM_add_shifts_table/migration.sql
# - Updates schema.prisma

# Deploy to prod
npx prisma migrate deploy

# View schema changes
npx prisma studio
```

### Common Query Patterns

```typescript
// Create with tenant isolation
const shift = await prisma.shift.create({
  data: {
    tenantId: req.user.tenantId,
    name: "Morning Shift",
    startTime: "09:00",
    endTime: "17:30",
  },
});

// Find with tenant filter (CRITICAL)
const shifts = await prisma.shift.findMany({
  where: { tenantId: req.user.tenantId },
});

// Update safely
const updated = await prisma.shift.update({
  where: { id: shiftId },
  data: { name: "New Name" },
});

// Delete with cascade
const deleted = await prisma.shift.delete({
  where: { id: shiftId },
});
```

---

## Part 2: Service Layer Architecture

### Service Pattern

Each major feature has a service file handling business logic:

```typescript
// src/services/shiftService.ts

class ShiftService {
  async getActiveShift(tenantId: string, employeeId: string, date: Date) {
    // 1. Validate inputs
    if (!employeeId || !date) throw new Error("Missing params");
    
    // 2. Query database
    const assignment = await prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        shift: { tenantId },
        effectiveFrom: { lte: date },
        effectiveTill: { gte: date },
      },
      include: { shift: true },
    });
    
    // 3. Handle not found
    if (!assignment) {
      throw new NotFoundError("No shift assigned for date");
    }
    
    // 4. Return data
    return assignment.shift;
  }

  async calculateLateMinutes(
    punchedAt: Date,
    shiftStart: string,
    gracePeriod: number = 5
  ): Promise<number> {
    const [shiftHour, shiftMin] = shiftStart.split(":").map(Number);
    const shiftStartTime = new Date(punchedAt);
    shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);
    
    const allowedStart = new Date(shiftStartTime);
    allowedStart.setMinutes(allowedStart.getMinutes() + gracePeriod);
    
    if (punchedAt > allowedStart) {
      return Math.floor(
        (punchedAt.getTime() - allowedStart.getTime()) / (1000 * 60)
      );
    }
    return 0;
  }
}

export default new ShiftService();
```

### Error Handling in Services

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Usage
throw new AppError(404, "Shift not found", "SHIFT_NOT_FOUND");
throw new AppError(400, "Invalid date range", "INVALID_DATE_RANGE");
throw new AppError(409, "Overlapping shift assignment", "OVERLAP_ERROR");
```

---

## Part 3: API Endpoint Design

### Standard Response Format

```typescript
// Success response
{
  "success": true,
  "data": { /* payload */ },
  "message": "Shift created successfully"
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "startTime", "message": "Required" }
    ]
  }
}
```

### Middleware Pattern

```typescript
// src/middleware/auth.ts
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as JWTPayload;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// src/middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }
  
  res.status(500).json({ error: "Internal server error" });
}
```

### Route Pattern

```typescript
// src/routes/shiftRoutes.ts
import express from "express";
import { authMiddleware } from "../middleware/auth";
import { shiftController } from "../controllers/shiftController";

const router = express.Router();

router.use(authMiddleware); // All routes require auth

// GET /api/admin/shifts
router.get("/", shiftController.listShifts);

// POST /api/admin/shifts
router.post("/", shiftController.createShift);

// PUT /api/admin/shifts/:id
router.put("/:id", shiftController.updateShift);

// DELETE /api/admin/shifts/:id
router.delete("/:id", shiftController.deleteShift);

export default router;
```

### Controller Pattern

```typescript
// src/controllers/shiftController.ts
export class ShiftController {
  async createShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, startTime, endTime, weeklyOff } = req.body;
      
      // Validate
      if (!name || !type || !startTime || !endTime) {
        throw new AppError(400, "Missing required fields");
      }
      
      // Call service
      const shift = await shiftService.create({
        tenantId: req.user!.tenantId,
        name,
        type,
        startTime,
        endTime,
        weeklyOff,
      });
      
      // Return
      res.json({ success: true, data: shift });
    } catch (err) {
      next(err);
    }
  }
}

export const shiftController = new ShiftController();
```

---

## Part 4: Attendance Calculation Logic

### Daily Status Calculation Algorithm

```typescript
async function calculateDailyStatus(
  tenantId: string,
  employeeId: string,
  date: Date
): Promise<AttendanceStatus> {
  // Step 1: Get shift for date
  const shift = await shiftService.getActiveShift(tenantId, employeeId, date);
  
  // Step 2: Get punches for date
  const punches = await prisma.attendanceLog.findMany({
    where: {
      tenantId,
      userPin: employee.pin,
      punchedAt: {
        gte: startOfDay(date),
        lt: endOfDay(date),
      },
    },
    orderBy: { punchedAt: "asc" },
  });
  
  // Step 3: Check for leave
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      fromDate: { lte: date },
      toDate: { gte: date },
      status: "APPROVED",
    },
  });
  if (leave) return "LEAVE"; // Mark as leave
  
  // Step 4: Check weekly off
  if (shift.weeklyOff.includes(date.getDay())) {
    return "WEEKLY_OFF"; // Not required to punch
  }
  
  // Step 5: Analyze punches
  if (punches.length === 0) {
    return "ABSENT"; // No punch = absent
  }
  
  if (punches.length === 1) {
    // Only one punch - could be incomplete
    return "INCOMPLETE_PUNCH";
  }
  
  // Step 6: Calculate timing
  const firstPunch = punches[0].punchedAt;
  const lastPunch = punches[punches.length - 1].punchedAt;
  const gracePeriodMs = 5 * 60 * 1000; // 5 min grace
  const shiftEndTime = parseTime(shift.endTime); // "17:30"
  
  const isLate = firstPunch.getTime() > 
    (getTimeOfDay(shift.startTime).getTime() + gracePeriodMs);
  
  if (isLate) {
    const lateMinutes = Math.floor(
      (firstPunch.getTime() - getTimeOfDay(shift.startTime).getTime()) / 60000
    );
    return { status: "PRESENT", lateMinutes };
  }
  
  // Step 7: Check if OT
  const workEnd = lastPunch;
  const shiftEnd = getTimeOfDay(shift.endTime);
  
  if (workEnd > shiftEnd) {
    return { status: "OT", otMinutes: calculateOT(...) };
  }
  
  return "PRESENT";
}
```

---

## Part 5: Approval Workflow Logic

### Multi-Level Approval Chain

```typescript
async function routeForApproval(
  entityType: "LEAVE" | "OT" | "CORRECTION",
  entityId: string,
  submitterId: string,
  tenantId: string
) {
  // Step 1: Get workflow config
  const entity = await getEntity(entityType, entityId);
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      tenantId,
      entityType,
      // departmentId matches submitter's dept OR null (org-wide)
    },
    orderBy: { sequence: "asc" },
  });
  
  // Step 2: Find first approver
  const approver = await findApprover(
    workflow.approverRole, // "MANAGER" or "HR"
    submitterId,
    tenantId
  );
  
  // Step 3: Create approval log entry
  const approvalLog = await prisma.approvalLog.create({
    data: {
      entityType,
      entityId,
      step: workflow.sequence,
      approverId: approver.id,
      status: "PENDING",
      createdAt: new Date(),
    },
  });
  
  // Step 4: Send notification
  await emailService.sendApprovalRequest({
    to: approver.email,
    entityType,
    submitterName: submitter.name,
    approvalLogId: approvalLog.id,
  });
  
  return approvalLog;
}

async function approveRequest(
  approvalLogId: string,
  approverId: string,
  remarks?: string
) {
  // Step 1: Update approval log
  const approvalLog = await prisma.approvalLog.update({
    where: { id: approvalLogId },
    data: {
      status: "APPROVED",
      remarks,
      approvedAt: new Date(),
    },
  });
  
  // Step 2: Check if more steps
  const nextStep = await prisma.approvalWorkflow.findFirst({
    where: {
      entityType: approvalLog.entityType,
      sequence: { gt: approvalLog.step },
    },
  });
  
  if (nextStep) {
    // Route to next approver
    await routeForApproval(
      approvalLog.entityType,
      approvalLog.entityId,
      approverId,
      approvalLog.tenantId
    );
  } else {
    // Final approval - execute business logic
    if (approvalLog.entityType === "LEAVE") {
      await leaveService.executeLeaveApproval(approvalLog.entityId);
    } else if (approvalLog.entityType === "OT") {
      await otService.executeOTApproval(approvalLog.entityId);
    }
    
    // Send notification to submitter
    await emailService.sendApprovalComplete({
      to: submitter.email,
      status: "APPROVED",
    });
  }
}
```

---

## Part 6: Scheduled Jobs (Cron)

### Daily OT Calculation Job

```typescript
// src/jobs/calculateOTDaily.ts
import cron from "node-cron";

export function startOTCalculationJob() {
  // Run at 23:00 (11 PM)
  cron.schedule("0 23 * * *", async () => {
    console.log("[OT Job] Starting OT calculation...");
    
    try {
      const tenants = await prisma.tenant.findMany({
        where: { status: "ACTIVE" },
      });
      
      for (const tenant of tenants) {
        await calculateOTForTenant(tenant.id);
      }
      
      console.log("[OT Job] Completed successfully");
    } catch (err) {
      console.error("[OT Job] Error:", err);
      // Send alert email
      await emailService.sendAlert({
        subject: "OT Calculation Job Failed",
        error: err,
      });
    }
  });
}

async function calculateOTForTenant(tenantId: string) {
  // Get yesterday's completed attendance records
  const yesterday = subDays(new Date(), 1);
  
  const attendances = await prisma.attendanceLog.findMany({
    where: {
      tenantId,
      punchedAt: {
        gte: startOfDay(yesterday),
        lt: endOfDay(yesterday),
      },
      inOutMode: 0, // Complete punch (in+out)
    },
    include: { employee: true, shift: true },
  });
  
  // Calculate OT for each
  for (const att of attendances) {
    const shift = await shiftService.getActiveShift(
      tenantId,
      att.employeeId,
      att.punchedAt
    );
    
    const otHours = calculateOTHours(
      att.punchOutTime,
      shift.endTime,
      att.punchedAt
    );
    
    if (otHours > 0) {
      // Auto-create OT request
      await prisma.otRequest.create({
        data: {
          tenantId,
          employeeId: att.employeeId,
          requestDate: yesterday,
          otHours,
          calculationMethod: "AUTO",
          status: "AUTO",
        },
      });
      
      // Notify manager
      await emailService.sendOTNotification({
        to: employee.manager.email,
        employee: employee.name,
        otHours,
      });
    }
  }
}
```

---

## Part 7: Frontend Service Layer

### API Client Pattern

```typescript
// src/lib/api.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7788";

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Request interceptor: Add token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// API methods
export const shiftAPI = {
  list() {
    return apiClient.get("/api/admin/shifts");
  },
  create(data: ShiftFormData) {
    return apiClient.post("/api/admin/shifts", data);
  },
  update(id: string, data: ShiftFormData) {
    return apiClient.put(`/api/admin/shifts/${id}`, data);
  },
  delete(id: string) {
    return apiClient.delete(`/api/admin/shifts/${id}`);
  },
};
```

### React Hook for Data Fetching

```typescript
// src/hooks/useShifts.ts
import { useEffect, useState } from "react";
import { shiftAPI } from "../lib/api";

export function useShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const res = await shiftAPI.list();
        setShifts(res.data.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    
    fetchShifts();
  }, []);
  
  return { shifts, loading, error };
}
```

### React Component Pattern

```typescript
// src/pages/admin/Shifts.tsx
import { useShifts } from "../../hooks/useShifts";
import { ShiftForm } from "../../components/ShiftForm";

export function ShiftsPage() {
  const { shifts, loading, error } = useShifts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shifts</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Shift
        </button>
      </div>
      
      {isFormOpen && (
        <ShiftForm onClose={() => setIsFormOpen(false)} />
      )}
      
      <div className="grid gap-4">
        {shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}
      </div>
    </div>
  );
}
```

---

## Part 8: Testing Strategy

### Unit Test Pattern (Jest)

```typescript
// src/services/__tests__/shiftService.test.ts
describe("ShiftService", () => {
  describe("getActiveShift", () => {
    it("should return shift for employee on valid date", async () => {
      const result = await shiftService.getActiveShift(
        "tenant-1",
        "employee-1",
        new Date("2026-06-15")
      );
      
      expect(result).toEqual(
        expect.objectContaining({
          name: "Morning Shift",
          startTime: "09:00",
        })
      );
    });
    
    it("should throw NotFoundError if no shift assigned", async () => {
      await expect(
        shiftService.getActiveShift(
          "tenant-1",
          "employee-2",
          new Date("2026-06-15")
        )
      ).rejects.toThrow("No shift assigned");
    });
  });
  
  describe("calculateLateMinutes", () => {
    it("should return 0 if punch within grace period", () => {
      const result = shiftService.calculateLateMinutes(
        new Date("2026-06-15 09:03:00"), // 3 min late
        "09:00",
        5 // 5 min grace
      );
      
      expect(result).toBe(0);
    });
    
    it("should return minutes late if beyond grace", () => {
      const result = shiftService.calculateLateMinutes(
        new Date("2026-06-15 09:12:00"), // 12 min late
        "09:00",
        5 // 5 min grace
      );
      
      expect(result).toBe(7); // 12 - 5
    });
  });
});
```

---

## Part 9: Environment & Configuration

### .env Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/prime_attendance"

# JWT
JWT_SECRET="your-very-long-secure-secret-key-min-32-chars"
JWT_EXPIRE="7d"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="notifications@yourdomain.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="Prime Attendance <notifications@yourdomain.com>"

# Admin setup
SUPER_ADMIN_EMAIL="admin@primetechbd.xyz"
SUPER_ADMIN_PASSWORD="Admin@12345"

# Frontend
VITE_API_URL="http://localhost:7788"

# Timezone
TZ="Asia/Dhaka"

# Feature flags
ERPNEXT_ENABLED="false"
ERPNEXT_URL=""
ERPNEXT_API_KEY=""
ERPNEXT_API_SECRET=""
```

---

## Part 10: Deployment Checklist

```bash
# 1. Build
npm run build:server
npm run build:client

# 2. Test
npm run test
npm run test:e2e

# 3. Database
npx prisma migrate deploy

# 4. Start
npm run start

# 5. Verify
curl http://localhost:7788/api/health
```

---

**Status:** ✅ Technical Guide Complete
**Version:** 1.0
