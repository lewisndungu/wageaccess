# Chat Service API Migration Guide

This document explains how the chat service was migrated from a local storage-based implementation to a server API implementation.

## Overview

The WageAccessSaas application now features a server-based chat service that integrates with the existing employee data system. This migration allows for:

1. Persistent chat history across devices
2. Server-side message processing
3. Integration with the employee database
4. File upload and processing through the server
5. More powerful search functionality

## Components Modified

### Server-Side Changes

1. **New APIs in routes.ts**
   - `/api/chat/message` - Process user messages
   - `/api/chat/history/:userId` - Get chat history
   - `/api/chat/upload` - Upload and process files
   - `/api/chat/import-employees` - Import employees from uploaded data
   - `/api/chat/search-employee` - Search for employees
   - `/api/chat/calculate-payroll` - Calculate payroll
   - `/api/chat/command` - Save user commands
   - `/api/chat/search` - Save user searches

2. **Storage Module (storage.ts)**
   - Added `MemCollection` for in-memory storage of chat data
   - Added chat-specific storage functions:
     - `saveMessage`
     - `getMessagesByUser`
     - `saveUserChatHistory`
     - `getUserChatHistory`
     - `saveCommand`
     - `saveSearch`
   - Added employee management functions:
     - `findEmployees`
     - `addEmployees`
     - `getEmployees`

3. **Chat Service Implementation (chat-service.ts)**
   - Created server-side implementation of the chat service
   - Implemented business logic for processing messages
   - Integrated with the employee data system

### Client-Side Changes

1. **Chat Service Client (chat-service.ts)**
   - Converted to use API calls instead of local storage
   - Added error handling and offline fallback
   - Implemented convertApiMessage function to handle server responses

2. **Chat Interface Component (ChatInterface.tsx)**
   - Updated to work with async API calls
   - Added server-side action handling
   - Fixed confirmation dialog handlers
   - Improved file upload process

3. **Employee Data Integration (store.ts)**
   - Enhanced Employee interface to match server structure
   - Added conversion function for server-client data mapping
   - Improved store operations for employee management

## Using the Chat Service

### Client-Side API

The client-side API remains largely the same, with these notable differences:

1. Most functions are now async and return Promises
2. Actions from the server need to be handled through the action ID
3. Files are processed on the server, not in the browser

### Key Endpoints

- `POST /api/chat/message` - Send a message to be processed
- `GET /api/chat/history/:userId` - Get chat history for a user
- `POST /api/chat/upload` - Upload a file for processing
- `GET /api/chat/search-employee` - Search for employees

## Future Improvements

1. Authentication integration
2. Real-time updates using WebSockets
3. Improved error handling and recovery
4. More sophisticated natural language processing
5. Integration with third-party services

## Rollback Plan

In case of issues, the system will automatically fall back to using localStorage for critical functionality, ensuring minimal disruption to users. 