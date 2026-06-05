### Request Layer (Controller / DTO)
- Validate only data shape and format: types, enum membership, numeric range, required fields, string patterns (email, UUID, etc.)
- Enforce via class-validator decorators on DTOs with ValidationPipe. No business logic here.

### Domain Layer (Entity / Value Object / Domain Service)
- All business rule validation lives here: state transitions, invariants, authorization constraints, cross-field rules.
- Domain classes guard their own consistency on construction and state changes, throwing domain-specific exceptions on violation.
- This ensures business rules are enforced regardless of the entry point (controller, event handler, CLI, etc.).