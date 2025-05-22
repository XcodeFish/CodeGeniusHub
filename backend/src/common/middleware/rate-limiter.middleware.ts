import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  lastRequest: number;
}

/**
 * 验证码频率限制中间件
 * 限制同一IP在指定时间内的请求次数
 */
@Injectable()
export class CaptchaRateLimiterMiddleware implements NestMiddleware {
  // 使用内存存储请求记录，生产环境建议使用Redis
  private readonly ipRequestMap: Map<string, RateLimitRecord> = new Map();

  // 配置项
  private readonly windowMs: number = 60 * 1000; // 1分钟时间窗口
  private readonly maxRequests: number = 3; // 在时间窗口内允许的最大请求数，调整为3次

  // 定期清理过期记录
  constructor() {
    // 每10分钟清理一次过期的IP记录
    setInterval(() => this.cleanupExpiredRecords(), 10 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const now = Date.now();

    // 获取现有请求记录或创建新记录
    let record = this.ipRequestMap.get(ip) || { count: 0, lastRequest: 0 };

    // 检查是否在当前时间窗口内
    if (now - record.lastRequest > this.windowMs) {
      // 如果超过了时间窗口，重置计数
      record = { count: 1, lastRequest: now };
    } else {
      // 在当前时间窗口内增加计数
      record.count += 1;
      record.lastRequest = now;

      // 如果超过限制，拒绝请求
      if (record.count > this.maxRequests) {
        const timeLeft = Math.ceil(
          (record.lastRequest + this.windowMs - now) / 1000,
        );

        // 使用正确的HTTP状态码429表示太多请求
        throw new HttpException(
          {
            code: 1429, // 自定义频率限制错误码
            message: `操作过于频繁，请${timeLeft}秒后再试`,
            timeLeft: timeLeft,
          },
          HttpStatus.TOO_MANY_REQUESTS, // 使用429状态码
        );
      }
    }

    // 更新记录
    this.ipRequestMap.set(ip, record);

    next();
  }

  /**
   * 获取客户端IP地址
   */
  private getClientIp(request: Request): string {
    let ip = request.ip;

    // 获取X-Forwarded-For头部，这通常包含原始客户端IP
    const forwardedIp = request.headers['x-forwarded-for'];
    if (forwardedIp) {
      // 如果是逗号分隔的多个IP，取第一个（最原始的客户端IP）
      ip = Array.isArray(forwardedIp)
        ? forwardedIp[0]
        : forwardedIp.split(',')[0].trim();
    }

    return ip || '127.0.0.1';
  }

  /**
   * 清理过期的IP记录
   */
  private cleanupExpiredRecords() {
    const now = Date.now();
    this.ipRequestMap.forEach((record, ip) => {
      if (now - record.lastRequest > this.windowMs) {
        this.ipRequestMap.delete(ip);
      }
    });
  }
}
