Feature show remaining usage quota of each account.
1. get api: http://localhost:20128/api/providers, this api return like this:
{
  "connections": [
    {
      "id": "cf5dc287-827f-4b24-bb2b-ff945a01f011",
      "provider": "kiro",
      "authType": "oauth",
      "name": "Account 1",
      "priority": 1,
      "isActive": true,
      "createdAt": "2026-04-05T03:00:45.859Z",
      "updatedAt": "2026-04-05T06:19:30.019Z",
      "expiresAt": "2026-04-05T07:19:30.017Z",
      "testStatus": "active",
      "expiresIn": 3600,
      "providerSpecificData": {
        "profileArn": null,
        "clientId": "Bz-I_dz6AO3HJzdx9Xi-jXVzLWVhc3QtMQ"
}
    },
    {
      "id": "f820d08f-1c0d-4fb5-9c5f-90bc69ac4b42",
      "provider": "codex",
      "authType": "oauth",
      "name": "Account 1",
      "priority": 1,
      "isActive": true,
      "createdAt": "2026-04-05T03:22:10.946Z",
      "updatedAt": "2026-04-05T03:22:10.946Z",
      "expiresAt": "2026-04-15T03:22:10.945Z",
      "testStatus": "active",
      "expiresIn": 864000
    },
    {
      "id": "75e0688e-72ba-44e6-bba0-a69f7737eab5",
      "provider": "kilocode",
      "authType": "oauth",
      "name": "tuan88291@gmail.com",
      "priority": 1,
      "isActive": true,
      "createdAt": "2026-04-05T03:39:16.162Z",
      "updatedAt": "2026-04-05T03:39:16.162Z",
      "email": "tuan88291@gmail.com",
      "testStatus": "active"
    }
  ]

- get id field and call this api: http://localhost:20128/api/usage/{id}, response:
{
  "plan": "free",
  "limitReached": false,
  "quotas": {
    "session": {
      "used": 33,
      "total": 100,
      "remaining": 67,
      "resetAt": "2026-04-12T03:26:29.000Z",
      "unlimited": false
    },
    "weekly": {
      "used": 0,
      "total": 100,
      "remaining": 100,
      "resetAt": null,
      "unlimited": false
    }
  }
}
use this response to show on nice UI, create new screen for that and add new item for that in control
}