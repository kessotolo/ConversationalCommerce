# Buyer Profile API

These endpoints allow a buyer to view and update their profile.

## Get Profile

```
GET /api/v1/profile
```

Returns the currently authenticated buyer's profile. Responds with `404` if the account does not exist.

## Update Profile

```
PATCH /api/v1/profile
```

Accepts partial fields from `CustomerUpdate` and returns the updated profile.
