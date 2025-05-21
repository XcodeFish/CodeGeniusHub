import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

interface MailJob {
  id: string;
  to: string;
  subject: string;
  template: string;
  context: any;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  createdAt: Date;
}

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly queue: Map<string, MailJob> = new Map();
  private readonly maxRetries: number = 3;
  private readonly retryDelays: number[] = [60000, 300000, 1800000]; // 1分钟, 5分钟, 30分钟
  private processing: boolean = false;

  // 限流相关
  private readonly rateLimits: Map<string, number> = new Map();
  private readonly rateWindowMs: number = 3600000; // 1小时窗口
  private readonly maxEmailsPerHour: number = 10; // 每小时最大邮件数

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    // 构造函数中读取配置
    this.maxRetries = this.configService.get('mail.maxRetries') || 3;
    const configRetryDelays = this.configService.get('mail.retryDelays');
    if (configRetryDelays) {
      this.retryDelays = configRetryDelays;
    }

    const maxEmailsPerHour = this.configService.get('mail.maxEmailsPerHour');
    if (maxEmailsPerHour && !isNaN(maxEmailsPerHour)) {
      this.maxEmailsPerHour = maxEmailsPerHour;
    }
  }

  /**
   * 添加邮件到队列
   */
  async addToQueue(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<boolean> {
    // 检查发送频率限制
    if (!this.checkRateLimit(to)) {
      this.logger.warn(`邮件发送频率超限: ${to}`);
      return false;
    }

    const id = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const job: MailJob = {
      id,
      to,
      subject,
      template,
      context,
      attempts: 0,
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      nextAttempt: new Date(),
    };

    this.queue.set(id, job);
    this.updateRateLimit(to);
    this.logger.log(`邮件已添加到队列: ${id}, 收件人: ${to}`);

    // 如果队列处理器没有运行，启动它
    if (!this.processing) {
      this.processQueue();
    }

    return true;
  }

  /**
   * 处理邮件队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    this.logger.debug('开始处理邮件队列');

    try {
      for (const [id, job] of this.queue.entries()) {
        // 如果还没到重试时间，跳过
        if (job.nextAttempt && job.nextAttempt > new Date()) {
          continue;
        }

        try {
          await this.mailerService.sendMail({
            to: job.to,
            subject: job.subject,
            template: job.template,
            context: job.context,
          });

          // 发送成功，从队列中移除
          this.queue.delete(id);
          this.logger.log(`邮件发送成功: ${id}, 收件人: ${job.to}`);
        } catch (error) {
          job.attempts++;
          job.lastAttempt = new Date();

          if (job.attempts >= job.maxAttempts) {
            // 达到最大重试次数，移出队列
            this.queue.delete(id);
            this.logger.error(
              `邮件发送失败，已达最大重试次数: ${id}, 收件人: ${job.to}`,
              error.stack,
            );
          } else {
            // 设置下次重试时间
            const delay =
              this.retryDelays[job.attempts - 1] ||
              this.retryDelays[this.retryDelays.length - 1];
            job.nextAttempt = new Date(Date.now() + delay);
            this.logger.warn(
              `邮件发送失败，将在${delay / 1000}秒后重试: ${id}, 收件人: ${job.to}, 尝试次数: ${job.attempts}`,
              error.message,
            );
            // 更新队列中的作业
            this.queue.set(id, job);
          }
        }
      }
    } finally {
      this.processing = false;

      // 如果队列不为空，继续处理
      if (this.queue.size > 0) {
        setTimeout(() => this.processQueue(), 5000); // 5秒后再次处理队列
      }
    }
  }

  /**
   * 定时任务，每分钟处理一次队列
   */
  @Cron('0 * * * * *') // 每分钟执行一次
  handleCron() {
    if (this.queue.size > 0 && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * 清理过期的速率限制记录
   */
  @Cron('0 0 * * * *') // 每小时执行一次
  cleanupRateLimits() {
    const now = Date.now();
    for (const [email, timestamp] of this.rateLimits.entries()) {
      if (now - timestamp > this.rateWindowMs) {
        this.rateLimits.delete(email);
      }
    }
  }

  /**
   * 检查邮件发送频率
   */
  private checkRateLimit(email: string): boolean {
    const windowStart = Date.now() - this.rateWindowMs;
    const count = this.getEmailCountInWindow(email, windowStart);
    return count < this.maxEmailsPerHour;
  }

  /**
   * 获取指定时间窗口内的邮件数量
   */
  private getEmailCountInWindow(email: string, windowStart: number): number {
    // 这是一个简化实现，实际应用中应该使用Redis或数据库追踪
    // 当前实现只记录总数，不记录具体的时间
    const lastTime = this.rateLimits.get(email) || 0;
    return lastTime > windowStart ? 1 : 0;
  }

  /**
   * 更新邮件发送记录
   */
  private updateRateLimit(email: string): void {
    this.rateLimits.set(email, Date.now());
  }

  /**
   * 获取队列中的作业数量
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * 获取队列状态信息
   */
  getQueueStats() {
    return {
      size: this.queue.size,
      processing: this.processing,
      rateLimitedEmails: this.rateLimits.size,
    };
  }
}
