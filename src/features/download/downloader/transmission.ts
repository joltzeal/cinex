// lib/downloaders/transmission.ts

// 【修改 1】移除旧的 Prisma 类型导入
// import { DownloaderSetting } from "@prisma/client";

// 【修改 2】导入新的、我们自己定义的配置类型
import { DownloaderConfig } from "@/lib/downloader";
import { DownloaderClient, DownloaderStats, Torrent, TorrentStatus } from "@/types/download";

export class TransmissionClient implements DownloaderClient {
    private readonly rpcUrl: string;
    private sessionId: string | null = null;

    // 【修改 3】将构造函数参数的类型从 DownloaderSetting 更改为 DownloaderConfig
    constructor(private settings: DownloaderConfig) {
        // ---- 从这里开始，下面的所有代码都无需任何修改 ----
        
        if (!this.settings.host) {
            throw new Error("Transmission host is not configured.");
        }
        const protocol = this.settings.host.startsWith('http') ? '' : 'http://';
        this.rpcUrl = `${protocol}${this.settings.host}${this.settings.port ? `:${this.settings.port}` : ''}/transmission/rpc`;
    }

    private async request(body: object): Promise<any> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.settings.username) {
            headers['Authorization'] = 'Basic ' + btoa(`${this.settings.username}:${this.settings.password || ''}`);
        }
        if (this.sessionId) {
            headers['X-Transmission-Session-Id'] = this.sessionId;
        }

        let response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (response.status === 409) {
            this.sessionId = response.headers.get('X-Transmission-Session-Id');
            if (!this.sessionId) {
                throw new Error("Failed to get X-Transmission-Session-Id from Transmission.");
            }
            headers['X-Transmission-Session-Id'] = this.sessionId;
            response = await fetch(this.rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Transmission RPC failed: ${errorText}`);
        }

        return response.json();
    }

    async addTorrent(url: string): Promise<{ success: boolean; message: string; }> {
        const body = {
            method: "torrent-add",
            arguments: {
                filename: url,
            },
        };

        const response = await this.request(body);

        if (response.result === 'success') {
            return { success: true, message: "任务已成功添加到 Transmission。" };
        } else {
            return { success: false, message: `添加到 Transmission 失败: ${response.result}` };
        }
    }

    async getTorrents(): Promise<Torrent[]> {
        const body = {
            method: 'torrent-get',
            arguments: {
                fields: [
                    'id', 'hashString', 'name', 'totalSize', 'percentDone', 'status',
                    'rateDownload', 'rateUpload', 'eta', 'addedDate'
                ],
            },
        };
        const response = await this.request(body);
        const torrents = response.arguments.torrents || [];
        return torrents.map((t: any) => this.mapToUnifiedTorrent(t));
    }

    private mapToUnifiedTorrent(t: any): Torrent {
        const statusMap: { [key: number]: TorrentStatus } = {
            0: 'paused',    // TR_STATUS_STOPPED
            1: 'checking',  // TR_STATUS_CHECK_WAIT
            2: 'checking',  // TR_STATUS_CHECK
            3: 'downloading',// TR_STATUS_DOWNLOAD_WAIT
            4: 'downloading',// TR_STATUS_DOWNLOAD
            5: 'seeding',   // TR_STATUS_SEED_WAIT
            6: 'seeding',   // TR__STATUS_SEED
        };

        return {
            id: t.hashString,
            hash: t.hashString,
            name: t.name,
            size: t.totalSize,
            progress: t.percentDone,
            status: statusMap[t.status] || 'error',
            downloadSpeed: t.rateDownload,
            uploadSpeed: t.rateUpload,
            eta: t.eta,
            addedOn: t.addedDate,
            contentPath: t.contentPath,
            savePath: t.savePath,
            rootPath: t.rootPath,
        };
    }
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const body = { method: "session-get" };
            const response = await this.request(body);
            if (response.result === 'success') {
                const version = response.arguments.version;
                return { success: true, message: `连接成功！版本: ${version}` };
            }
            return { success: false, message: `连接失败: ${response.result}` };
        } catch (error: any) {
            return { success: false, message: `连接出错: ${error.message}` };
        }
    }

    async getStats(): Promise<DownloaderStats> {
        try {
            const body = { method: "session-stats" };
            const response = await this.request(body);
            
            if (response.result === 'success') {
                const stats = response.arguments;
                
                return {
                    downloadSpeed: stats.downloadSpeed || 0,           // 当前下载速度 (bytes/s)
                    uploadSpeed: stats.uploadSpeed || 0,               // 当前上传速度 (bytes/s)
                    totalDownloaded: stats['cumulative-stats']?.downloadedBytes || 0, // 总下载量 (bytes)
                    totalUploaded: stats['cumulative-stats']?.uploadedBytes || 0,     // 总上传量 (bytes)
                };
            }
            
            // 如果请求失败，返回默认值
            return {
                downloadSpeed: 0,
                uploadSpeed: 0,
                totalDownloaded: 0,
                totalUploaded: 0,
            };
        } catch (error: any) {
            // 出错时返回默认值
            return {
                downloadSpeed: 0,
                uploadSpeed: 0,
                totalDownloaded: 0,
                totalUploaded: 0,
            };
        }
    }
}