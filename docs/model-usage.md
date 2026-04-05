api: http://localhost:20128/api/usage/history
api field need to get: recentRequests

- feature show total: use totalRequests, totalPromptTokens, totalCompletionTokens fields to show on the top of list

api response:
{
  "totalRequests": 16,
  "totalPromptTokens": 188958,
  "totalCompletionTokens": 814,
  "totalCost": 0.10466744,
  "byProvider": {
    "kiro": {
      "requests": 12,
      "promptTokens": 148880,
      "completionTokens": 362,
      "cost": 0.04183844
    },
    "codex": {
      "requests": 4,
      "promptTokens": 40078,
      "completionTokens": 452,
      "cost": 0.062829
    }
  },
  "byModel": {
    "deepseek-3.2 (kiro)": {
      "requests": 12,
      "promptTokens": 148880,
      "completionTokens": 362,
      "cost": 0.04183844,
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "lastUsed": "2026-04-05T03:25:02.069Z"
    },
    "gpt-5.1-codex-mini (codex)": {
      "requests": 4,
      "promptTokens": 40078,
      "completionTokens": 452,
      "cost": 0.062829,
      "rawModel": "gpt-5.1-codex-mini",
      "provider": "codex",
      "lastUsed": "2026-04-05T03:26:34.499Z"
    }
  },
  "byAccount": {
    "deepseek-3.2 (kiro - Account 1)": {
      "requests": 12,
      "promptTokens": 148880,
      "completionTokens": 362,
      "cost": 0.04183844,
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "connectionId": "cf5dc287-827f-4b24-bb2b-ff945a01f011",
      "accountName": "Account 1",
      "lastUsed": "2026-04-05T03:25:02.069Z"
    },
    "gpt-5.1-codex-mini (codex - Account 1)": {
      "requests": 4,
      "promptTokens": 40078,
      "completionTokens": 452,
      "cost": 0.062829,
      "rawModel": "gpt-5.1-codex-mini",
      "provider": "codex",
      "connectionId": "f820d08f-1c0d-4fb5-9c5f-90bc69ac4b42",
      "accountName": "Account 1",
      "lastUsed": "2026-04-05T03:26:34.499Z"
    }
  },
  "byApiKey": {
    "local-no-key": {
      "requests": 4,
      "promptTokens": 9588,
      "completionTokens": 194,
      "cost": 0.00276612,
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "apiKey": null,
      "keyName": "Local (No API Key)",
      "apiKeyKey": "local-no-key",
      "lastUsed": "2026-04-05T03:06:47.211Z"
    },
    "sk-fa2843cd91b9d22e-tpt55j-4c4b3910|deepseek-3.2|kiro": {
      "requests": 8,
      "promptTokens": 139292,
      "completionTokens": 168,
      "cost": 0.03907232,
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "apiKey": "sk-fa2843cd91b9d22e-tpt55j-4c4b3910",
      "keyName": "testkey",
      "apiKeyKey": "sk-fa2843cd91b9d22e-tpt55j-4c4b3910",
      "lastUsed": "2026-04-05T03:25:02.069Z"
    },
    "sk-fa2843cd91b9d22e-tpt55j-4c4b3910|gpt-5.1-codex-mini|codex": {
      "requests": 4,
      "promptTokens": 40078,
      "completionTokens": 452,
      "cost": 0.062829,
      "rawModel": "gpt-5.1-codex-mini",
      "provider": "codex",
      "apiKey": "sk-fa2843cd91b9d22e-tpt55j-4c4b3910",
      "keyName": "testkey",
      "apiKeyKey": "sk-fa2843cd91b9d22e-tpt55j-4c4b3910",
      "lastUsed": "2026-04-05T03:26:34.499Z"
    }
  },
  "byEndpoint": {
    "Unknown|deepseek-3.2|kiro": {
      "requests": 6,
      "promptTokens": 74440,
      "completionTokens": 181,
      "cost": 0.02091922,
      "endpoint": "Unknown",
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "lastUsed": "2026-04-05T03:25:02.069Z"
    },
    "/v1/chat/completions|deepseek-3.2|kiro": {
      "requests": 6,
      "promptTokens": 74440,
      "completionTokens": 181,
      "cost": 0.02091922,
      "endpoint": "/v1/chat/completions",
      "rawModel": "deepseek-3.2",
      "provider": "kiro",
      "lastUsed": "2026-04-05T03:25:02.069Z"
    },
    "Unknown|gpt-5.1-codex-mini|codex": {
      "requests": 2,
      "promptTokens": 20039,
      "completionTokens": 226,
      "cost": 0.0314145,
      "endpoint": "Unknown",
      "rawModel": "gpt-5.1-codex-mini",
      "provider": "codex",
      "lastUsed": "2026-04-05T03:26:34.499Z"
    },
    "/v1/chat/completions|gpt-5.1-codex-mini|codex": {
      "requests": 2,
      "promptTokens": 20039,
      "completionTokens": 226,
      "cost": 0.0314145,
      "endpoint": "/v1/chat/completions",
      "rawModel": "gpt-5.1-codex-mini",
      "provider": "codex",
      "lastUsed": "2026-04-05T03:26:34.498Z"
    }
  },
  "last10Minutes": [
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    },
    {
      "requests": 0,
      "promptTokens": 0,
      "completionTokens": 0,
      "cost": 0
    }
  ],
  "pending": {
    "byModel": {
      "qwen3-coder-flash (qwen)": 0,
      "gemini-3-flash (antigravity)": 0,
      "deepseek-3.2 (kiro)": 0,
      "gpt-5.1-codex-mini (codex)": 0
    },
    "byAccount": {
      "f579cf81-32a9-4be2-b3a8-4b7ed1b573d4": {
        "qwen3-coder-flash (qwen)": 0
      },
      "bb800bb1-8e31-4955-8f86-4019fd4d54ac": {
        "gemini-3-flash (antigravity)": 0
      },
      "cf5dc287-827f-4b24-bb2b-ff945a01f011": {
        "deepseek-3.2 (kiro)": 0
      },
      "f820d08f-1c0d-4fb5-9c5f-90bc69ac4b42": {
        "gpt-5.1-codex-mini (codex)": 0
      }
    }
  },
  "activeRequests": [],
  "recentRequests": [
    {
      "timestamp": "2026-04-05T03:26:34.499Z",
      "model": "gpt-5.1-codex-mini",
      "provider": "codex",
      "promptTokens": 11145,
      "completionTokens": 199,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:26:28.542Z",
      "model": "gpt-5.1-codex-mini",
      "provider": "codex",
      "promptTokens": 8894,
      "completionTokens": 27,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:25:02.069Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 19531,
      "completionTokens": 23,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:24:55.735Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 15321,
      "completionTokens": 3,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:09:29.057Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 19579,
      "completionTokens": 37,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:09:22.744Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 15215,
      "completionTokens": 21,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:06:47.211Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 2398,
      "completionTokens": 49,
      "status": "ok"
    },
    {
      "timestamp": "2026-04-05T03:01:17.835Z",
      "model": "deepseek-3.2",
      "provider": "kiro",
      "promptTokens": 2396,
      "completionTokens": 48,
      "status": "ok"
    }
  ],
  "errorProvider": ""
}
