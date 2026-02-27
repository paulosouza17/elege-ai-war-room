# Future Improvement: Per-Node Configurable Timeout

## Context
Currently all HTTP request nodes use a default timeout of 120 seconds. The global FlowExecutor node timeout is 3 minutes (180s).

## Proposed Feature
Allow users to configure a custom timeout (in seconds) on ANY node in the FlowBuilder UI.

### Backend (already partially supported)
- `HttpRequestHandler.ts` already reads `node.data.timeout` — just needs UI to set it
- `FlowExecutor.ts` line ~258: could read `currentNode.data?.timeout` for per-node override

### Frontend Changes Needed
1. **FlowBuilder.tsx** — Add a "Timeout (s)" input field in the node config panel for ALL node types
2. Store as `node.data.timeout` (number, in seconds)
3. Show default placeholder of "120" 
4. Validate: min 5s, max 600s

### Handler Changes
Each handler should read `node.data.timeout`:
```typescript
const timeoutMs = (node.data.timeout || 120) * 1000;
```

### FlowExecutor Changes
```typescript
const nodeTimeout = (currentNode.data?.timeout || 180) * 1000;
const output = await Promise.race([
    handler.execute(currentNode, context),
    new Promise<never>((_, reject) =>
        setTimeout(() => reject(...), nodeTimeout)
    )
]);
```
