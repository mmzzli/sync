import * as fs from 'node:fs';
import { join } from 'path';
import { EventEmitter } from 'events';

// 任务状态枚举
enum TaskStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 文件名常量
enum Files {
  WAITING = '-waiting-tasks.json',
  FAILED = '-failed-tasks.json',
}

// 队列选项接口
interface QueueOptions {
  dataDir?: string;
  concurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  loadPersisted?: boolean;
}

// 任务选项接口
interface TaskOptions {
  attempts: number;
  maxRetries: number;
  retryDelay: number;
}

// 任务接口
interface Task<T = any> {
  id: string;
  data: T;
  opts: TaskOptions;
  status: TaskStatus;
  timestamp: number;
  lastError?: string;
  completedAt?: number;
}

// 处理器类型
type Processor<T = any> = (data: T) => Promise<void>;

class Bull<T = any> extends EventEmitter {
  private queueName: string;
  private waitingTasks: Map<string, Task<T>> = new Map();
  private activeTasks: Map<string, Task<T>> = new Map();
  private failedTasksCount: number = 0; // 只存储失败任务的数量
  private options: Required<QueueOptions>;
  private processor: ((data: T) => Promise<void>) | null = null;
  private isProcessing: boolean = false;
  private retryInterval: NodeJS.Timeout | null = null; // 添加重试定时器

  constructor(queueName: string, options: QueueOptions = {}) {
    super();
    this.queueName = queueName;
    this.options = {
      dataDir: '.queue',
      concurrent: 1,
      maxRetries: 3,
      retryDelay: 1000,
      loadPersisted: true,
      ...options,
    } as Required<QueueOptions>;
    this.init();
    this.startRetryInterval(); // 启动重试定时器
  }

  private init() {
    try {
      const queueDir = join(this.options.dataDir, this.queueName);
      fs.mkdirSync(queueDir, { recursive: true });

      if (this.options.loadPersisted) {
        this.loadPersistedTasks();
      }
    } catch (err) {
      console.error('Queue initialization failed:', err);
      throw err;
    }
  }

  private getFilePath(fileType: keyof typeof Files): string {
    return join(
      this.options.dataDir,
      this.queueName,
      this.queueName + Files[fileType],
    );
  }

  private loadPersistedTasks(): void {
    try {
      const waitingPath = this.getFilePath('WAITING');
      try {
        const content = fs.readFileSync(waitingPath, 'utf8');
        const tasks = JSON.parse(content) as Task<T>[];
        for (const task of tasks) {
          task.status = TaskStatus.WAITING;
          this.waitingTasks.set(task.id, task);
        }
        fs.unlinkSync(waitingPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error loading waiting tasks:', err);
        }
      }

      const failedPath = this.getFilePath('FAILED');
      try {
        const content = fs.readFileSync(failedPath, 'utf8');
        const tasks = JSON.parse(content) as Task<T>[];
        this.failedTasksCount = tasks.length; // 只更新计数
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error loading failed tasks:', err);
        }
      }
    } catch (err) {
      console.error('Error loading persisted tasks:', err);
    }

    console.log(
      `Loaded ${this.waitingTasks.size} waiting tasks and ${this.failedTasksCount} failed tasks`,
    );
  }

  private saveWaitingTasks(): void {
    const tasks = Array.from(this.waitingTasks.values());
    if (tasks.length > 0) {
      fs.writeFileSync(
        this.getFilePath('WAITING'),
        JSON.stringify(tasks, null, 2),
      );
    } else {
      try {
        fs.unlinkSync(this.getFilePath('WAITING'));
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error removing waiting tasks file:', err);
        }
      }
    }
  }

  private saveFailedTasks(): void {
    const failedPath = this.getFilePath('FAILED');
    try {
      const content = fs.readFileSync(failedPath, 'utf8');
      const tasks = JSON.parse(content) as Task<T>[];
      tasks.push({
        id: Date.now().toString(),
        status: TaskStatus.FAILED,
        data: {} as T,
        opts: {
          attempts: 0,
          maxRetries: this.options.maxRetries || 3,
          retryDelay: this.options.retryDelay || 1000,
        },
        lastError: 'Task failed',
        timestamp: Date.now(),
      });
      fs.writeFileSync(failedPath, JSON.stringify(tasks, null, 2));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // 如果文件不存在,创建新文件
        fs.writeFileSync(
          failedPath,
          JSON.stringify(
            [
              {
                id: Date.now().toString(),
                status: TaskStatus.FAILED,
                data: {} as T,
                opts: {
                  attempts: 0,
                  maxRetries: this.options.maxRetries || 3,
                  retryDelay: this.options.retryDelay || 1000,
                },
                lastError: 'Task failed',
                timestamp: Date.now(),
              },
            ],
            null,
            2,
          ),
        );
      } else {
        console.error('Error saving failed tasks:', err);
      }
    }
  }

  add(data: T): Task<T> {
    const taskId = (data as any).id?.toString() || Date.now().toString();
    const task: Task<T> = {
      id: taskId,
      data,
      opts: {
        attempts: 0,
        maxRetries: this.options.maxRetries,
        retryDelay: this.options.retryDelay,
      },
      status: TaskStatus.WAITING,
      timestamp: Date.now(),
    };

    this.waitingTasks.set(taskId, task);
    this.emit('waiting', task);

    if (this.isProcessing) {
      this.processTasks();
    }

    return task;
  }

  process(processor: Processor<T>): void {
    if (this.processor) {
      throw new Error('Cannot define multiple processors');
    }

    this.processor = processor;
    this.isProcessing = true;

    this.processTasks();
  }

  private processTasks(): void {
    if (!this.isProcessing || !this.processor) return;

    try {
      if (this.activeTasks.size >= this.options.concurrent) {
        return;
      }

      for (const [taskId, task] of this.waitingTasks) {
        if (this.activeTasks.size >= this.options.concurrent) break;

        this.waitingTasks.delete(taskId);
        this.activeTasks.set(taskId, task);
        task.status = TaskStatus.ACTIVE;

        this.emit('active', task);

        this.processTask(task);
      }
    } catch (err) {
      console.error('Error processing tasks:', err);
    }
  }

  private async processTask(task: Task<T>): Promise<void> {
    try {
      await this.processor!(task.data);
      this.completeTask(task);
    } catch (err) {
      this.failTask(task, err as Error);
    }
  }

  private completeTask(task: Task<T>): void {
    this.activeTasks.delete(task.id);
    task.status = TaskStatus.COMPLETED;
    task.completedAt = Date.now();
    this.emit('completed', task);
    this.processTasks();
  }

  private failTask(task: Task<T>, error: Error) {
    this.activeTasks.delete(task.id);
    task.opts.attempts++;
    task.lastError = error.message;

    if (task.opts.attempts <= task.opts.maxRetries) {
      task.status = TaskStatus.WAITING;
      this.waitingTasks.set(task.id, task);

      this.emit('failed', task, error);
      this.emit('retrying', task);

      setTimeout(() => this.processTasks(), task.opts.retryDelay);
    } else {
      task.status = TaskStatus.FAILED;
      this.failedTasksCount++; // 增加失败计数
      this.saveFailedTasks(); // 保存到文件

      this.emit('failed', task, error);
    }
  }

  // 添加启动重试定时器的方法
  private startRetryInterval(): void {
    // 每20分钟执行一次重试
    this.retryInterval = setInterval(
      () => {
        this.retryFailedTasks();
      },
      20 * 60 * 1000,
    );
  }

  // 添加重试失败任务的方法
  private retryFailedTasks(): void {
    try {
      const failedPath = this.getFilePath('FAILED');
      const content = fs.readFileSync(failedPath, 'utf8');
      const tasks = JSON.parse(content) as Task<T>[];

      if (tasks.length === 0) return;

      console.log(`开始重试 ${tasks.length} 个失败任务`);

      // 重置任务状态并重新加入队列
      for (const task of tasks) {
        task.status = TaskStatus.WAITING;
        task.opts.attempts = 0; // 重置重试次数
        task.lastError = undefined;
        this.waitingTasks.set(task.id, task);
      }

      // 清空失败任务文件
      fs.writeFileSync(failedPath, JSON.stringify([], null, 2));
      this.failedTasksCount = 0;

      // 开始处理任务
      if (this.isProcessing) {
        this.processTasks();
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('重试失败任务时出错:', err);
      }
    }
  }

  async pause(): Promise<void> {
    this.isProcessing = false;

    // 停止重试定时器
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // 等待所有活动任务完成
    while (this.activeTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 保存剩余的等待任务
    this.saveWaitingTasks();

    this.emit('paused');
  }

  resume(): void {
    this.isProcessing = true;
    this.startRetryInterval(); // 恢复重试定时器
    this.emit('resumed');
    this.processTasks();
  }

  getStatus(): {
    waiting: number;
    active: number;
    failed: number;
  } {
    return {
      waiting: this.waitingTasks.size,
      active: this.activeTasks.size,
      failed: this.failedTasksCount, // 返回失败计数
    };
  }

  clean(grace: number = 0): void {
    if (grace > 0) {
      const failedPath = this.getFilePath('FAILED');
      try {
        const stat = fs.statSync(failedPath);
        if (Date.now() - stat.mtime.getTime() > grace) {
          fs.unlinkSync(failedPath);
          this.failedTasksCount = 0;
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error cleaning failed tasks:', err);
        }
      }
    }
  }

  // 添加清理已完成任务的方法
  private cleanCompletedTasks(): void {
    try {
      const now = Date.now();
      const CLEANUP_THRESHOLD = 5 * 1000; // 30秒就清理

      // 清理已完成任务
      for (const [taskId, task] of this.activeTasks.entries()) {
        if (task.completedAt && now - task.completedAt > CLEANUP_THRESHOLD) {
          this.activeTasks.delete(taskId);
        }
      }

      // 每次清理时打印内存使用情况
      const used = process.memoryUsage();
      console.log(this.activeTasks.size, 'activeTasks');
      console.log(this.waitingTasks.size, 'waitingTasks');
      console.log(this.failedTasksCount, 'failedTasks');
      console.log({
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`,
      });

      if (global.gc) {
        global.gc();
      }
    } catch (err) {
      console.error('Error cleaning completed tasks:', err);
    }
  }
}

export default Bull;
