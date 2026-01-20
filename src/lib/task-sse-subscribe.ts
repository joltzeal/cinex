import { toast } from "sonner";
import { SseMessage } from "@/types/download"; // 假设你存放类型的位置

/**
 * 处理 SSE 任务并同步更新 Toast
 * @param taskId 任务ID
 * @param onData 可选的回调，用于在组件内部处理数据（如更新图表或列表）
 */
export const subscribeToTaskToast = (taskId: string, onData?: (data: SseMessage) => void) => {
  // 1. 创建一个初始的 Loading Toast，并保存 ID
  const toastId = toast.loading("正在建立连接...", {
    description: "请稍候，正在初始化任务通道",
  });

  // 2. 建立 SSE 连接 (假设你的后端路由是 /api/sse?taskId=xyz)
  const eventSource = new EventSource(`/api/download/status/${taskId}`);

  eventSource.onmessage = (event) => {
    try {
      // 解析后端发来的 JSON 数据
      // 注意：你的后端发送格式是 `data: ${JSON.stringify(data)}\n\n`
      const data: SseMessage = JSON.parse(event.data);
      
      // 触发回调给组件使用（如果有）
      if (onData) onData(data);

      // 3. 根据 Stage 更新 Toast 状态
      switch (data.stage) {
        case 'CONNECTED':
          toast.loading("连接成功", {
            id: toastId, // 关键：指定 ID 以更新同一个 Toast
            description: data.message || "等待任务开始...",
          });
          break;

        case 'AI_START':
          toast.loading("AI 正在思考", {
            id: toastId,
            description: data.message || "正在生成内容...",
          });
          break;

        case 'PROGRESS':
           // 如果 data.data 中包含百分比，甚至可以在这里渲染自定义 JSX
           // const percent = data.data?.percent || 0;
           toast.loading(`处理中...`, {
             id: toastId,
             description: `${data.message}`,
           });
           break;

        case 'AI_COMPLETE':
          toast.loading("AI 生成完成", {
            id: toastId,
            description: "正在准备下载...",
          });
          break;

        case 'DOWNLOAD_SUBMIT':
          toast.loading("提交下载", {
            id: toastId,
            description: "正在处理文件...",
          });
          break;

        case 'DONE':
          // 任务完成：将 Toast 变为 Success 状态
          toast.success("任务完成", {
            id: toastId,
            description: data.message || "所有操作已成功结束。",
            duration: 4000, // 成功后显示 4 秒自动消失
          });
          eventSource.close(); // 关闭连接
          break;

        case 'ERROR':
          // 任务出错：将 Toast 变为 Error 状态
          toast.error("任务失败", {
            id: toastId,
            description: data.message || "发生了未知错误。",
          });
          eventSource.close();
          break;
      }

    } catch (error) {
      console.error("SSE 解析错误", error);
      // 防止 JSON 解析失败导致 Toast 卡死在 loading
      toast.error("数据解析错误", { id: toastId });
      eventSource.close();
    }
  };

  eventSource.onerror = (err) => {
    console.error("SSE 连接错误", err);
    // 网络中断或连接失败
    toast.error("连接断开", {
      id: toastId,
      description: "无法连接到服务器，请重试。",
    });
    eventSource.close();
  };

  // 返回关闭函数，以便组件卸载时手动清理（如果需要）
  return () => eventSource.close();
};