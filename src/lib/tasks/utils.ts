import { PushNotificationService } from '../push-notification';
// 获取推送服务实例
export async function getPushService(): Promise<PushNotificationService | null> {
    try {
        // 从数据库获取推送配置
        const { db } = await import('../db');
        const setting = await db.setting.findUnique({
            where: { key: 'pushNotificationConfig' }
        });

        if (!setting) {
            console.log('推送配置未在设置中配置，请在设置页面配置推送服务后重试', 'warn');
            return null;
        }

        // 解析配置
        const config = setting.value as {
            domain: string;
            username: string;
            token?: string;
        };

        if (!config.domain || !config.username) {
            console.log('推送配置不完整，请在设置页面正确配置域名和用户名', 'warn');
            return null;
        }

        return new PushNotificationService(config);
    } catch (error) {
        console.log(`获取推送服务失败: ${error}`, 'error');
        return null;
    }
}