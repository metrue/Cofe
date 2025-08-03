# GraphQL API Documentation

## Overview

The Cofe app provides a GraphQL API endpoint at `/api/graphql` for managing memos from external applications (e.g., iOS apps).

**Endpoint**: `https://blog.minghe.me/api/graphql`

## Authentication

The API uses NextAuth for authentication. **Queries are public** (no auth needed), but **mutations require authentication** via session cookies.

### Getting an Authentication Token

NextAuth stores the session as an HTTP-only cookie, not a Bearer token. Here's how to get it:

#### Method 1: Extract from Browser (Development/Testing)

1. **Login to your web app**:
   - Go to `https://blog.minghe.me/login` (or `http://localhost:3001/login` for local)
   - Sign in with GitHub

2. **Get the session token**:
   - Open **Developer Tools** (F12)
   - Go to **Application** tab → **Cookies** → Select your domain
   - Find cookie named `next-auth.session-token` or `__Secure-next-auth.session-token`
   - **Copy the Value** - this is your `YOUR_TOKEN`

   ![Cookie Example](https://i.imgur.com/example.png)

3. **Alternative - Use JavaScript Console**:
   ```javascript
   // In browser console after login
   document.cookie
     .split('; ')
     .find(row => row.startsWith('next-auth.session-token='))
     ?.split('=')[1]
   ```

#### Method 2: For Production Apps (iOS/Android)

For mobile apps, implement OAuth flow:

1. **Redirect to GitHub OAuth**:
   ```
   https://blog.minghe.me/api/auth/signin/github
   ```

2. **Handle callback and extract session cookie**:
   ```swift
   // iOS Example
   let session = ASWebAuthenticationSession(
       url: authURL,
       callbackURLScheme: "your-app"
   ) { callbackURL, error in
       // Extract session cookie from response headers
   }
   ```

3. **Store session cookie securely** for future API calls

## Schema

### Types

```graphql
type Memo {
  id: String!
  content: String!
  timestamp: String!
  image: String
}

input CreateMemoInput {
  content: String!
  image: String
}
```

### Queries

#### Get All Memos

```graphql
query GetMemos {
  memos {
    id
    content
    timestamp
    image
  }
}
```

### Mutations

#### Create a New Memo

```graphql
mutation CreateMemo($input: CreateMemoInput!) {
  createMemo(input: $input) {
    id
    content
    timestamp
    image
  }
}
```

**Variables:**
```json
{
  "input": {
    "content": "Your memo content here",
    "image": "https://example.com/image.jpg" // optional
  }
}
```

## Testing the API

### 1. Using cURL

#### Test Query (Get Memos) - No Auth Required
```bash
curl -X POST https://blog.minghe.me/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetMemos { memos { id content timestamp image } }"
  }'
```

#### Test Mutation (Create Memo) - Auth Required

**Step 1: Get your session token** (see Authentication section above)

**Step 2: Use the token in Cookie header**
```bash
curl -X POST https://blog.minghe.me/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation CreateMemo($input: CreateMemoInput!) { createMemo(input: $input) { id content timestamp image } }",
    "variables": {
      "input": {
        "content": "Test memo from API",
        "image": "https://example.com/test.jpg"
      }
    }
  }'
```

**Example with actual token**:
```bash
# Replace eyJ0eXAiOiJKV1QiLCJhbGc... with your actual token
curl -X POST http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -d '{
    "query": "mutation CreateMemo($input: CreateMemoInput!) { createMemo(input: $input) { id content timestamp } }",
    "variables": {
      "input": {
        "content": "Hello from authenticated API!"
      }
    }
  }'
```

### 2. Using Postman

#### For Queries (No Auth):
1. **Method**: POST
2. **URL**: `https://blog.minghe.me/api/graphql`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "query": "query GetMemos { memos { id content timestamp image } }"
   }
   ```

#### For Mutations (With Auth):
1. **Method**: POST
2. **URL**: `https://blog.minghe.me/api/graphql`
3. **Headers**:
   - `Content-Type: application/json`
   - `Cookie: next-auth.session-token=YOUR_TOKEN_HERE`
4. **Body** (raw JSON):
   ```json
   {
     "query": "mutation CreateMemo($input: CreateMemoInput!) { createMemo(input: $input) { id content timestamp image } }",
     "variables": {
       "input": {
         "content": "Hello from Postman!",
         "image": "https://example.com/image.jpg"
       }
     }
   }
   ```

**How to get YOUR_TOKEN_HERE for Postman:**
1. Login to your web app in the same browser
2. Open Developer Tools → Application → Cookies
3. Find `next-auth.session-token` and copy its value
4. Paste it in the Cookie header above

### 3. Using Browser Developer Console (Easiest for Testing)

After logging into your web app, open browser Developer Console and run:

```javascript
// Test Query (no auth needed)
fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'query GetMemos { memos { id content timestamp } }'
  })
})
.then(res => res.json())
.then(console.log)

// Test Mutation (uses existing session automatically)
fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include session cookies
  body: JSON.stringify({
    query: `mutation CreateMemo($input: CreateMemoInput!) { 
      createMemo(input: $input) { id content timestamp } 
    }`,
    variables: {
      input: { content: "Test from browser console!" }
    }
  })
})
.then(res => res.json())
.then(console.log)
```

### 4. Local Development Testing

```bash
# Start the development server
npm run dev

# Test query (no auth) locally
curl -X POST http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query GetMemos { memos { id content timestamp } }"}'

# Test mutation (with auth) - get token from browser first
curl -X POST http://localhost:3001/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"query": "mutation CreateMemo($input: CreateMemoInput!) { createMemo(input: $input) { id content timestamp } }", "variables": {"input": {"content": "Local test memo"}}}'
```

## iOS App Integration

### Using Apollo iOS Client

1. Install Apollo iOS:
```swift
dependencies: [
    .package(url: "https://github.com/apollographql/apollo-ios.git", from: "1.0.0")
]
```

2. Generate GraphQL types:
```bash
# Add schema.graphql to your project
# Run codegen
apollo-ios-cli generate
```

3. Example Swift code with authentication:
```swift
import Apollo

class GraphQLService {
    private var apollo: ApolloClient
    private var sessionToken: String?
    
    init() {
        let store = ApolloStore()
        let client = URLSessionClient()
        let provider = NetworkInterceptorProvider(store: store, client: client)
        let url = URL(string: "https://blog.minghe.me/api/graphql")!
        let transport = RequestChainNetworkTransport(interceptorProvider: provider, endpointURL: url)
        self.apollo = ApolloClient(networkTransport: transport, store: store)
    }
    
    func setSessionToken(_ token: String) {
        self.sessionToken = token
    }
    
    func createMemo(content: String, image: String? = nil) {
        let mutation = CreateMemoMutation(input: CreateMemoInput(content: content, image: image))
        
        // Add session cookie to request
        var headers: [String: String] = [:]
        if let token = sessionToken {
            headers["Cookie"] = "next-auth.session-token=\(token)"
        }
        
        apollo.perform(mutation: mutation, context: headers) { result in
            switch result {
            case .success(let graphQLResult):
                if let memo = graphQLResult.data?.createMemo {
                    print("Created memo: \(memo.id)")
                }
                if let errors = graphQLResult.errors {
                    print("GraphQL errors: \(errors)")
                }
            case .failure(let error):
                print("Network error: \(error)")
            }
        }
    }
    
    // Fetch memos (no auth required)
    func fetchMemos() {
        let query = GetMemosQuery()
        
        apollo.fetch(query: query) { result in
            switch result {
            case .success(let graphQLResult):
                if let memos = graphQLResult.data?.memos {
                    print("Fetched \(memos.count) memos")
                }
            case .failure(let error):
                print("Error: \(error)")
            }
        }
    }
}

// Usage
let graphQL = GraphQLService()

// First, authenticate and get session token through OAuth
// Then set it:
graphQL.setSessionToken("eyJ0eXAiOiJKV1QiLCJhbGc...")

// Now you can create memos
graphQL.createMemo(content: "Hello from iOS!")
```

## Error Handling

The API returns standard GraphQL errors:

```json
{
  "errors": [
    {
      "message": "Authentication required",
      "locations": [{"line": 1, "column": 1}]
    }
  ]
}
```

Common errors:
- `Authentication required` - Missing or invalid JWT token
- `Failed to create memo` - GitHub API error or file update failure

## Rate Limits

The API inherits GitHub's rate limits since it uses the GitHub API for data persistence. Authenticated requests have higher limits (5000/hour) compared to unauthenticated requests.

## Quick Reference

### Getting YOUR_TOKEN (Step by Step)

1. **Open your web app** → `https://blog.minghe.me/login`
2. **Login with GitHub**
3. **Open Developer Tools** (F12 or Right-click → Inspect)
4. **Go to Application tab** → **Cookies** → Select your domain
5. **Find cookie**: `next-auth.session-token` or `__Secure-next-auth.session-token`
6. **Copy the Value** - that's your token!

### Quick Test Commands

```bash
# Test Query (no auth needed)
curl -X POST https://blog.minghe.me/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { memos { id content timestamp } }"}'

# Test Mutation (replace YOUR_TOKEN with actual token)
curl -X POST https://blog.minghe.me/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"query": "mutation CreateMemo($input: CreateMemoInput!) { createMemo(input: $input) { id content timestamp } }", "variables": {"input": {"content": "API test memo"}}}'
```

### Common Issues

- **"Authentication required"** → Missing or invalid session token
- **"POST body sent invalid JSON"** → Check JSON escaping in cURL
- **"Cannot return null for non-nullable field"** → Server error, check logs
- **CORS errors** → Make sure you're using the correct domain