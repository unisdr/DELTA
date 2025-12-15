# Hazardous Event Update - Additional Tables Feature

## Overview

The `hazardousEventUpdate` and `hazardousEventUpdateByIdAndCountryAccountsId` functions now support updating/inserting data into additional database tables within the same transaction as the hazardous event update.

This feature is useful when you need to:
- Save related data to multiple tables atomically
- Maintain data consistency across tables
- Avoid multiple separate database transactions
- Log custom audit information
- Update denormalized data across tables

## API

### Function Signature

```typescript
export async function hazardousEventUpdate(
  tx: Tx,
  id: string,
  fields: Partial<HazardousEventFields>,
  countryAccountsId?: string,
  additionalTables?: AdditionalTableData[]
): Promise<UpdateResult<HazardousEventFields>>

export async function hazardousEventUpdateByIdAndCountryAccountsId(
  tx: Tx,
  id: string,
  countryAccountsId: string,
  fields: Partial<HazardousEventFields>,
  additionalTables?: AdditionalTableData[]
): Promise<UpdateResult<HazardousEventFields>>
```

### AdditionalTableData Interface

```typescript
export interface AdditionalTableData {
  table: any;          // The Drizzle table object
  data: any;           // The data to insert or update
  whereClause?: any;   // Optional where clause for updates
}
```

## Usage Examples

### Example 1: Basic Update (Backward Compatible)

Existing code continues to work without changes:

```typescript
import { hazardousEventUpdate } from "~/backend.server/models/event";

// Simple update without additional tables
await hazardousEventUpdate(tx, eventId, {
  description: "Updated description",
  magnitude: "High"
});
```

### Example 2: Insert into Additional Table

Insert a custom audit log entry along with the hazardous event update:

```typescript
import { hazardousEventUpdate } from "~/backend.server/models/event";
import { auditLogsTable } from "~/drizzle/schema";

await hazardousEventUpdate(
  tx,
  eventId,
  {
    description: "Critical event update",
    magnitude: "Critical"
  },
  "country-account-id",
  [
    {
      table: auditLogsTable,
      data: {
        tableName: "custom_operations",
        recordId: eventId,
        userId: currentUserId,
        action: "Manual critical update",
        oldValues: null,
        newValues: JSON.stringify({
          severity: "critical",
          notificationsSent: true
        })
      }
    }
  ]
);
```

### Example 3: Update Existing Records in Additional Tables

Update related records in other tables:

```typescript
import { hazardousEventUpdate } from "~/backend.server/models/event";
import { categoriesTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

await hazardousEventUpdate(
  tx,
  eventId,
  { description: "Updated event" },
  "country-account-id",
  [
    {
      table: categoriesTable,
      data: { 
        name: "Updated Category Name",
        updatedAt: new Date()
      },
      whereClause: eq(categoriesTable.id, categoryId)
    }
  ]
);
```

### Example 4: Multiple Table Operations

Perform multiple insert/update operations across different tables:

```typescript
import { hazardousEventUpdate } from "~/backend.server/models/event";
import { auditLogsTable, categoriesTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

await hazardousEventUpdate(
  tx,
  eventId,
  {
    description: "Multi-table update",
    approvalStatus: "validated"
  },
  "country-account-id",
  [
    // Insert audit log
    {
      table: auditLogsTable,
      data: {
        tableName: "hazardous_event",
        recordId: eventId,
        userId: userId,
        action: "Validation approved",
        oldValues: JSON.stringify(oldData),
        newValues: JSON.stringify(newData)
      }
    },
    // Update related category
    {
      table: categoriesTable,
      data: { 
        name: "Validated Events",
        updatedAt: new Date()
      },
      whereClause: eq(categoriesTable.id, relatedCategoryId)
    }
  ]
);
```

### Example 5: API Usage

Using the function in an API endpoint with tenant isolation:

```typescript
import { hazardousEventUpdateByIdAndCountryAccountsId } from "~/backend.server/models/event";
import { customTrackingTable } from "~/drizzle/schema";

export const action = async ({ request }: ActionFunctionArgs) => {
  const countryAccountsId = await getCountryAccountsIdFromApiKey(request);
  const data = await request.json();
  
  return await dr.transaction(async (tx) => {
    return await hazardousEventUpdateByIdAndCountryAccountsId(
      tx,
      data.id,
      countryAccountsId,
      {
        description: data.description,
        magnitude: data.magnitude
      },
      [
        {
          table: customTrackingTable,
          data: {
            eventId: data.id,
            apiSource: "external_api",
            timestamp: new Date(),
            metadata: JSON.stringify(data.metadata)
          }
        }
      ]
    );
  });
};
```

## Important Notes

### Transaction Safety

All operations (hazardous event update + additional table operations) are executed within a single database transaction. If any operation fails, the entire transaction is rolled back, ensuring data consistency.

### Error Handling

Errors from additional table operations will cause the entire transaction to fail:

```typescript
try {
  await hazardousEventUpdate(tx, eventId, fields, countryId, additionalTables);
} catch (error) {
  // Handle constraint violations or other database errors
  console.error("Update failed:", error);
}
```

### Performance Considerations

- Keep the number of additional table operations reasonable
- Consider the impact on transaction duration
- Use batch operations when updating many records

### Validation

The function does not validate the structure of `additionalTables` data. Ensure:
- Table objects are valid Drizzle table definitions
- Data matches the table schema
- Where clauses are properly constructed

## Migration Guide

### Before (Without Additional Tables)

```typescript
await dr.transaction(async (tx) => {
  // Update hazardous event
  await hazardousEventUpdate(tx, eventId, { description: "Updated" });
  
  // Manually insert to another table
  await tx.insert(auditLogsTable).values({
    tableName: "hazardous_event",
    recordId: eventId,
    ...
  });
});
```

### After (With Additional Tables)

```typescript
// Single transaction, cleaner code
await hazardousEventUpdate(
  dr,
  eventId,
  { description: "Updated" },
  "country-id",
  [
    {
      table: auditLogsTable,
      data: {
        tableName: "hazardous_event",
        recordId: eventId,
        ...
      }
    }
  ]
);
```

## Testing

A test case is included in `event_test.ts`:

```typescript
it("update with additional tables", async () => {
  // ... test implementation
});
```

Run tests with:
```bash
yarn test
```

## Support

For questions or issues related to this feature, please refer to:
- Code: `app/backend.server/models/event.ts`
- Tests: `app/backend.server/models/event_test.ts`
- Schema: `app/drizzle/schema.ts`
