/**
 * Cron 表达式工具函数
 * 用于计算下一次执行时间
 */

/**
 * 计算下一次执行时间
 * @param cronExpression Cron 表达式
 * @param timezone 时区，默认为 Asia/Shanghai
 * @returns 下一次执行时间的 Date 对象，如果无法计算则返回 null
 */
export function getNextExecutionTime(cronExpression: string, timezone: string = 'Asia/Shanghai'): Date | null {
  try {
    // 解析 cron 表达式
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      return null;
    }

    const [minute, hour, day, month, weekday] = parts;
    const now = new Date();
    
    // 创建目标时间，从当前时间开始
    const nextTime = new Date(now);
    
    // 处理分钟
    if (minute === '*') {
      // 每分钟执行
      nextTime.setSeconds(0, 0);
      if (nextTime <= now) {
        nextTime.setMinutes(nextTime.getMinutes() + 1);
      }
    } else if (minute.startsWith('*/')) {
      // 每隔 N 分钟执行
      const interval = parseInt(minute.substring(2));
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
      
      if (nextMinute >= 60) {
        nextTime.setHours(nextTime.getHours() + 1);
        nextTime.setMinutes(0);
      } else {
        nextTime.setMinutes(nextMinute);
      }
      nextTime.setSeconds(0, 0);
    } else if (minute === '0') {
      // 整点执行
      nextTime.setMinutes(0);
      nextTime.setSeconds(0, 0);
      if (nextTime <= now) {
        nextTime.setHours(nextTime.getHours() + 1);
      }
    } else {
      // 特定分钟执行
      const targetMinute = parseInt(minute);
      nextTime.setMinutes(targetMinute);
      nextTime.setSeconds(0, 0);
      if (nextTime <= now) {
        nextTime.setHours(nextTime.getHours() + 1);
      }
    }
    
    // 处理小时
    if (hour !== '*') {
      if (hour.startsWith('*/')) {
        // 每隔 N 小时执行
        const interval = parseInt(hour.substring(2));
        const currentHour = now.getHours();
        const nextHour = Math.ceil((currentHour + 1) / interval) * interval;
        
        if (nextHour >= 24) {
          nextTime.setDate(nextTime.getDate() + 1);
          nextTime.setHours(0);
        } else {
          nextTime.setHours(nextHour);
        }
      } else {
        // 特定小时执行
        const targetHour = parseInt(hour);
        nextTime.setHours(targetHour);
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + 1);
        }
      }
    }
    
    return nextTime;
  } catch (error) {
    console.error('计算下一次执行时间失败:', error);
    return null;
  }
}

/**
 * 格式化时间差为人类可读的格式
 * @param targetTime 目标时间
 * @returns 格式化的时间差字符串
 */
export function formatTimeUntil(targetTime: Date): string {
  const now = new Date();
  const diffMs = targetTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return '即将执行';
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}天${diffHours % 24}小时`;
  } else if (diffHours > 0) {
    return `${diffHours}小时${diffMinutes % 60}分钟`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分钟`;
  } else {
    return '即将执行';
  }
}

/**
 * 获取任务的下一次执行时间描述
 * @param cronExpression Cron 表达式
 * @param timezone 时区
 * @returns 格式化的时间描述
 */
export function getNextExecutionDescription(cronExpression: string, timezone: string = 'Asia/Shanghai'): string {
  const nextTime = getNextExecutionTime(cronExpression, timezone);
  
  if (!nextTime) {
    return '未设置周期执行';
  }
  
  const timeUntil = formatTimeUntil(nextTime);
  const timeString = nextTime.toLocaleString('zh-CN', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `${timeUntil} (${timeString})`;
}
