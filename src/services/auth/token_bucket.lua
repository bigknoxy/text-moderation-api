-- Redis Lua token-bucket script
-- KEYS: [1] key (per-api-key bucket key)
-- ARGV: [1] capacity, [2] refill_tokens_per_sec, [3] now_ts_seconds, [4] requested_tokens (usually 1)
-- Returns: {allowed (0|1), remaining_tokens, retry_after_sec}

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_sec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local v = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(v[1]) or capacity
local last = tonumber(v[2]) or now

local delta = math.max(0, now - last)
local refill = delta * refill_per_sec
tokens = math.min(capacity, tokens + refill)
local allowed = 0
local retry_after = 0

if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
else
  local missing = requested - tokens
  retry_after = math.ceil(missing / refill_per_sec)
  allowed = 0
end

redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('EXPIRE', key, 3600)

return {allowed, math.floor(tokens), retry_after}
