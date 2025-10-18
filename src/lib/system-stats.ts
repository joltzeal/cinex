import os from 'os';

// Helper function to get the current CPU state (total and idle time)
function getCpuInfo() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
  };
}

// State variables to hold the start and end measurements
let startMeasure: ReturnType<typeof getCpuInfo> | null = null;

/**
 * Calculates the current CPU usage percentage over a short interval.
 * @param {number} delay - The interval in milliseconds to measure CPU usage over.
 * @returns {Promise<number>} A promise that resolves to the CPU usage percentage.
 */
export function getCpuUsage(delay = 1000): Promise<number> {
  return new Promise(resolve => {
    // 如果这是第一次调用，先设置初始测量值
    if (startMeasure === null) {
      startMeasure = getCpuInfo();
    }
    
    setTimeout(() => {
      const endMeasure = getCpuInfo();
      const idleDifference = endMeasure.idle - startMeasure!.idle;
      const totalDifference = endMeasure.total - startMeasure!.total;
      
      // 防止除零错误
      if (totalDifference === 0) {
        resolve(0);
        return;
      }
      
      // Calculate the percentage of time the CPU was not idle
      const percentageCpu = Math.max(0, Math.min(100, 100 - (100 * idleDifference / totalDifference)));
      
      // Update the start measure for the next call
      startMeasure = endMeasure;
      
      resolve(percentageCpu);
    }, delay);
  });
}

/**
 * Gets memory usage statistics.
 * @returns {{total: number, free: number, used: number, usedPercent: number}}
 */
export function getMemoryUsage() {
    const totalMem = os.totalmem(); // in bytes
    const freeMem = os.freemem(); // in bytes
    const usedMem = totalMem - freeMem;
    const usedMemPercent = (usedMem / totalMem) * 100;

    // 获取进程内存使用情况作为参考
    const processMem = process.memoryUsage();
    

    return {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usedPercent: parseFloat(usedMemPercent.toFixed(2)),
    }
}