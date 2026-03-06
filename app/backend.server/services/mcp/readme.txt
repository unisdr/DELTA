MCP (Model Context Protocol) Service
=====================================

This folder contains the MCP implementation for the DTS application.

Files
-----
- types.ts        - MCP request/response interfaces
- constants.ts    - Entity configurations (entities, specialEntities, readOnlyEntities)
- utils.ts        - Helper functions (response builders, validation, parsing)
- tools.ts        - Tool definitions and field schemas
- client.ts       - Internal API client for backend communication
- handlers.ts     - Tool execution handlers (executeFields, executeList, executeAdd, etc.)
- docs.ts         - Documentation strings for DTS and Human Effects API

Usage
-----
The main route handler is at: app/routes/$lang+/api+/mcp.ts

It imports and uses these service modules to:
1. Handle MCP protocol requests (initialize, tools/list, tools/call, shutdown)
2. Authenticate API keys via apiAuth
3. Execute tool operations on DTS entities
4. Return MCP-compliant responses