import { jwtDecode } from 'jwt-decode';

/**
 * Token工具类，用于管理JWT token的解析、存储和过期检查
 */

// Token相关信息在localStorage中的key
const TOKEN_KEY = 'token';
const TOKEN_EXPIRES_AT_KEY = 'tokenExpiresAt';
const TOKEN_REMEMBERED_KEY = 'tokenRemembered';

// 配置选项
const TOKEN_CONFIG = {
  // 安全窗口时间，默认5分钟（单位：毫秒）
  safetyWindow: 5 * 60 * 1000,
};

/**
 * 保存token及相关信息到localStorage
 * @param token JWT token字符串
 * @param remembered 是否记住用户
 */
export const saveTokenInfo = (token: string, remembered: boolean): void => {
  try {
    // 解析token获取过期时间
    const decoded: any = jwtDecode(token);
    const expiresAt = decoded.exp * 1000;
        // 保存token、过期时间和"记住我"标志
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
    localStorage.setItem(TOKEN_REMEMBERED_KEY, remembered.toString());
    
    console.log(`Token已保存，将于${new Date(expiresAt).toLocaleString()}过期${remembered ? ' (已记住用户)' : ''}`);
  } catch (error) {
    console.error('解析或保存token信息失败:', error);
    // 解析失败时仍然保存token，但不保存过期时间
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_REMEMBERED_KEY, remembered.toString());
  }
};

/**
 * 从localStorage中清除所有token相关信息
 */
export const clearTokenInfo = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(TOKEN_REMEMBERED_KEY);
  console.log('Token信息已清除');
};

/**
 * 获取存储的token
 * @returns 存储的token字符串，如果不存在则返回null
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 获取token是否来自"记住我"选项
 * @returns 是否记住用户
 */
export const isTokenRemembered = (): boolean => {
  return localStorage.getItem(TOKEN_REMEMBERED_KEY) === 'true';
};

/**
 * 获取token的过期时间
 * @returns 过期时间的时间戳（毫秒），如果信息不存在则返回null
 */
export const getTokenExpiresAt = (): number | null => {
  const expiresAtStr = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  return expiresAtStr ? parseInt(expiresAtStr, 10) : null;
};

/**
 * 检查token是否已完全过期
 * @returns 如果token不存在或已过期，返回true
 */
export const isTokenExpired = (): boolean => {
  const expiresAt = getTokenExpiresAt();
  return !expiresAt || Date.now() >= expiresAt;
};
/**
 * 检查token是否过期或即将过期（针对"记住我"用户）
 * @param safetyWindow 提前多少毫秒视为即将过期，默认使用配置的安全窗口时间
 * @returns 如果token不存在、已过期或即将过期，返回true
 */
export const isTokenExpiredOrExpiring = (): boolean => {
  try {
    const token = getToken();
    if (!token) return true; // 没有token，视为已过期
    
    const decodedToken = jwtDecode(token);
    if (!decodedToken.exp) return true; // 无过期时间，视为已过期
    
    // 当前时间（秒）
    const now = Math.floor(Date.now() / 1000);
    
    // 提前5分钟（300秒）开始刷新
    const refreshThreshold = 300; // 5分钟
    
    // 如果token过期时间小于当前时间+5分钟，视为即将过期
    return decodedToken.exp < now + refreshThreshold;
  } catch (error) {
    console.error('Token解析失败:', error);
    return true; // 解析失败，视为已过期
  }
};

/**
 * 从token中解析用户信息
 * @returns 解析出的用户信息或null（如果解析失败）
 */
export const parseToken = (): any | null => {
  try {
    const token = getToken();
    if (!token) return null;
  
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    console.error('解析token失败:', error);
    return null;
  }
};

/**
 * 配置token相关参数
 * @param options 配置选项
 */
export const configureToken = (options: {safetyWindow?: number}): void => {
  if (options.safetyWindow !== undefined) {
    TOKEN_CONFIG.safetyWindow = options.safetyWindow;
  }
};