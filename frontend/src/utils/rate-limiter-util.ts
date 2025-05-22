/**
 * 频率限制工具，用于前端控制请求频率
 */

// 存储上次请求时间的Map，键为请求标识，值为请求时间
const requestTimestampMap = new Map<string, number>();

// 配置默认的窗口期和限制次数
const DEFAULT_WINDOW_MS = 60 * 1000; // 默认1分钟
const DEFAULT_MAX_REQUESTS = 3; // 默认最多3次请求

interface RateLimiterOptions {
  windowMs?: number; // 时间窗口，单位毫秒
  maxRequests?: number; // 最大请求次数 
}

interface CheckResult {
  allowed: boolean; // 是否允许请求
  timeLeft: number; // 剩余等待时间（秒）
  message: string; // 提示消息
}

/**
 * 检查是否可以发起请求
 * @param key 请求标识符，用于区分不同类型的请求
 * @param options 配置项
 * @returns 检查结果
 */
export function checkRateLimit(key: string, options?: RateLimiterOptions): CheckResult {
  const windowMs = options?.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests || DEFAULT_MAX_REQUESTS;
  
  const now = Date.now();
  const lastRequest = requestTimestampMap.get(key) || 0;
  const timeElapsed = now - lastRequest;
  
  // 如果超过时间窗口，重置计数
  if (timeElapsed > windowMs) {
    requestTimestampMap.set(key, now);
    return {
      allowed: true,
      timeLeft: 0,
      message: ''
    };
  }
  
  // 计算剩余等待时间
  const timeLeft = Math.ceil((windowMs - timeElapsed) / 1000);
  
  // 前端不记录具体次数，只判断是否在冷却期内
  return {
    allowed: false,
    timeLeft,
    message: `操作过于频繁，请${timeLeft}秒后再试`
  };
}

/**
 * 记录请求时间
 * @param key 请求标识符
 */
export function recordRequest(key: string): void {
  requestTimestampMap.set(key, Date.now());
}

/**
 * 清除请求记录
 * @param key 请求标识符，如果不提供则清除所有记录
 */
export function clearRateLimit(key?: string): void {
  if (key) {
    requestTimestampMap.delete(key);
  } else {
    requestTimestampMap.clear();
  }
} 