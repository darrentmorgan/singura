# Real-time Messaging (Socket.io)

## MODIFIED Requirements

### Requirement: Socket.io Message Handling
The system SHALL reliably transmit real-time updates between backend and frontend using Socket.io with proper error handling and message validation.

#### Scenario: Message broadcast successfully
- **WHEN** backend broadcasts a Socket.io message
- **AND** message conforms to expected schema
- **THEN** all connected clients SHALL receive the message
- **AND** clients SHALL process the message without errors
- **AND** no parsing errors SHALL appear in console

#### Scenario: Connection established and maintained
- **WHEN** user navigates to admin dashboard
- **THEN** Socket.io connection SHALL be established to backend
- **AND** connection status SHALL be logged
- **AND** if connection drops, automatic reconnection SHALL be attempted
- **AND** reconnection attempts SHALL be logged

## ADDED Requirements

### Requirement: Socket.io Message Validation
The system SHALL validate all Socket.io messages against defined schemas before broadcasting or processing to prevent parsing errors.

#### Scenario: Server validates message before broadcast
- **WHEN** backend attempts to broadcast a Socket.io message
- **THEN** the message SHALL be validated against its schema using Zod
- **AND** if validation succeeds, the message SHALL be broadcast to all clients
- **AND** if validation fails, the message SHALL NOT be broadcast
- **AND** validation failure SHALL be logged with message details (without sensitive data)

#### Scenario: Invalid message rejected by server
- **WHEN** backend attempts to broadcast an invalid Socket.io message
- **AND** message does not conform to schema (missing fields, wrong types)
- **THEN** Zod validation SHALL throw an error
- **AND** the error SHALL be logged: "[WebSocket] Invalid message format: {error details}"
- **AND** the invalid message SHALL NOT be sent to clients
- **AND** optionally, a system notification SHALL be sent to admins

#### Scenario: Client validates received message
- **WHEN** frontend receives a Socket.io message
- **THEN** the client SHALL check if message is an object
- **AND** if message is invalid type (not an object), it SHALL be logged and ignored
- **AND** if message is valid, it SHALL be processed and UI SHALL update
- **AND** processing errors SHALL be caught and logged without crashing UI

#### Scenario: Client handles malformed message gracefully
- **WHEN** frontend receives a malformed Socket.io message
- **THEN** the message SHALL be logged: "[Socket.io] Invalid message format: {data}"
- **AND** the message SHALL NOT update UI state
- **AND** the Socket.io connection SHALL remain active
- **AND** the client SHALL continue listening for valid messages

### Requirement: Socket.io Message Schemas
The system SHALL define TypeScript schemas for all Socket.io message types in `@singura/shared-types` for type safety and validation.

#### Scenario: Connection update message schema defined
- **WHEN** connection status changes (connected, disconnected, error)
- **THEN** the message SHALL conform to `ConnectionUpdateSchema`
- **AND** the message SHALL include: type, connectionId, status, platform, timestamp
- **AND** the schema SHALL be validated with Zod at runtime
- **AND** TypeScript SHALL enforce the schema at compile time

#### Scenario: Discovery progress message schema defined
- **WHEN** discovery progress updates
- **THEN** the message SHALL conform to `DiscoveryProgressSchema`
- **AND** the message SHALL include: type, connectionId, progress (0-100), status, itemsFound, timestamp
- **AND** the schema SHALL be validated with Zod at runtime

#### Scenario: Automation discovered message schema defined
- **WHEN** new automation is discovered
- **THEN** the message SHALL conform to `AutomationDiscoveredSchema`
- **AND** the message SHALL include: type, automationId, name, platform, riskLevel, timestamp
- **AND** the schema SHALL be validated with Zod at runtime

#### Scenario: System notification message schema defined
- **WHEN** system sends a notification
- **THEN** the message SHALL conform to `SystemNotificationSchema`
- **AND** the message SHALL include: type, level (info/warning/error), message, timestamp
- **AND** the schema SHALL be validated with Zod at runtime

### Requirement: Type-Safe Socket.io Broadcast Methods
The system SHALL provide type-safe methods for broadcasting Socket.io messages to prevent runtime errors.

#### Scenario: Type-safe connection update broadcast
- **WHEN** `WebSocketServer.broadcastConnectionUpdate()` is called
- **THEN** the method SHALL accept only `ConnectionUpdate['payload']` type
- **AND** TypeScript SHALL prevent passing incorrect types
- **AND** the method SHALL construct full message with type field
- **AND** the method SHALL call `broadcast()` with validated message

#### Scenario: Type-safe discovery progress broadcast
- **WHEN** `WebSocketServer.broadcastDiscoveryProgress()` is called
- **THEN** the method SHALL accept only `DiscoveryProgress['payload']` type
- **AND** TypeScript SHALL prevent passing incorrect types

#### Scenario: Generic broadcast validates all message types
- **WHEN** `WebSocketServer.broadcast()` is called with any message
- **THEN** the message SHALL be validated against `WebSocketMessageSchema`
- **AND** validation SHALL use discriminated union based on `type` field
- **AND** if validation fails, error SHALL be logged and message rejected

### Requirement: Socket.io Client Error Handling
The system SHALL handle Socket.io connection errors and message processing errors gracefully without crashing the UI.

#### Scenario: Connection error handled
- **WHEN** Socket.io connection fails
- **THEN** the error SHALL be logged: "[WebSocket] Error: {error details}"
- **AND** the client SHALL attempt reconnection according to configured strategy
- **AND** the UI SHALL show connection status indicator
- **AND** the application SHALL remain functional (without real-time updates)

#### Scenario: Message processing error handled
- **WHEN** message processing throws an error
- **THEN** the error SHALL be caught and logged: "[Socket.io] Error processing message: {error}"
- **AND** the error SHALL NOT crash the React component
- **AND** the Socket.io connection SHALL remain active
- **AND** subsequent messages SHALL still be processed

#### Scenario: Admin dashboard uses typed message hooks
- **WHEN** admin dashboard component renders
- **THEN** the component SHALL use `useConnectionUpdates(callback)` for connection updates
- **AND** the component SHALL use `useDiscoveryProgress(callback)` for discovery progress
- **AND** the component SHALL use `useAutomationDiscovered(callback)` for new automations
- **AND** the component SHALL use `useSystemNotifications(callback)` for system notifications
- **AND** each hook SHALL handle errors internally without crashing UI
