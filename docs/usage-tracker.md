Feature show remaining usage quota of each account.
1. get api: http://localhost:20128/api/providers, this api return like this:
{
  "connections": [
    ...
  ]
}

2. for each connection call http://localhost:20128/api/usage/{id} to fetch the quota object (may be null on providers with no quota data)

3. expose new backend proxy /api/usage-tracker mirroring the above calls
4. create a new screen ``UsageTrackerScreen`` under Control with a status button instead of refresh on ModelUsage. The flow is: ModelUsage screen uses /api/model-usage/history and totals; pressing status button navigates to UsageTracker and calls /api/usage-tracker to show each connection name/provider, plan, and session+weekly quotas if avail, otherwise show "Not supported".
5. keep UI/theme consistent with ModelUsage list (cards/spacing/colors)
