import { prisma } from "@/lib/prisma";
import { DownloaderClient } from "@/types/download";
import { qBittorrentClient } from "./qbittorrent";
import { TransmissionClient } from "./transmission";
import { DownloaderName } from "@/lib/downloader";
import { getSetting, SettingKey } from "@/services/settings";

/**
 * 获取当前启用的下载器客户端实例
 * @throws 如果没有启用或配置不完整的下载器，则抛出错误
 * @returns {Promise<DownloaderClient>}
 */
export async function getActiveClient(): Promise<DownloaderClient> {
    const setting = await getSetting(SettingKey.DownloaderSettings);

    const settingsData = setting;
    
    if (!settingsData) {
        throw new Error("没有配置任何下载器。请在设置页面配置。");
    }

    // 查找启用的下载器
    const downloaderNames: DownloaderName[] = ['qbittorrent', 'transmission'];
    let activeDownloader: DownloaderName | null = null;
    let activeConfig = null;

    for (const name of downloaderNames) {
        const config = settingsData[name];
        if (config?.enabled && config.host) {
            activeDownloader = name;
            activeConfig = { name, ...config };
            break;
        }
    }

    if (!activeDownloader || !activeConfig) {
        throw new Error("没有启用任何下载器。请在设置页面启用一个。");
    }

    switch (activeDownloader) {
        case 'qbittorrent':
            return new qBittorrentClient(activeConfig);
        case 'transmission':
            return new TransmissionClient(activeConfig);
        default:
            throw new Error(`不支持的下载器类型: ${activeDownloader}`);
    }
}