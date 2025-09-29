# 外部下载 API 文档

## 概述

`/api/download/folo` 接口允许外部应用向系统提交下载请求，支持跨域访问。

## 接口信息

- **URL**: `/api/download/folo`
- **方法**: `POST`
- **Content-Type**: `application/json`
- **CORS**: 支持跨域请求

## 请求参数

### 必需参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `urls` | `string[]` | 下载链接数组，支持磁力链接 |

### 可选参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `title` | `string` | `外部请求 - {时间戳}` | 文档标题 |
| `description` | `string` | `来自外部应用的下载请求` | 文档描述 |
| `downloadImmediately` | `boolean` | `false` | 是否立即开始下载 |
| `movieData` | `object` | `null` | 电影数据（用于JAV类型） |

## 请求示例

### 基本请求

```bash
curl -X POST http://localhost:3000/api/download/folo \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "magnet:?xt=urn:btih:1de10641c0dc55d8223788ba51643bfc4cba402f&dn=test1",
      "magnet:?xt=urn:btih:638EB10BC17DA57050AD50FC9964BF5738EE50E2&dn=test2"
    ],
    "title": "我的下载任务",
    "description": "从外部应用提交的下载请求",
    "downloadImmediately": true
  }'
```

### JavaScript 示例

```javascript
const response = await fetch('http://localhost:3000/api/download/folo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    urls: [
      'magnet:?xt=urn:btih:1de10641c0dc55d8223788ba51643bfc4cba402f&dn=test1',
      'magnet:?xt=urn:btih:638EB10BC17DA57050AD50FC9964BF5738EE50E2&dn=test2'
    ],
    title: '我的下载任务',
    description: '从外部应用提交的下载请求',
    downloadImmediately: true
  })
});

const result = await response.json();
console.log(result);
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "文档创建成功",
  "documentId": "22f5f6ea-0651-464c-a005-5f192fb9c53a",
  "urlsCount": 2
}
```

### 立即下载响应

```json
{
  "success": true,
  "message": "下载任务已启动",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "documentId": "22f5f6ea-0651-464c-a005-5f192fb9c53a",
  "urlsCount": 2
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息"
}
```

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误（缺少URL或格式不正确） |
| 409 | 链接已存在 |
| 500 | 服务器内部错误 |

## 功能特性

### 1. 自动去重
- 系统会自动检查提交的链接是否已存在
- 如果存在重复链接，会返回 409 错误

### 2. 智能处理
- 支持磁力链接和哈希值
- 自动提取文件信息和截图
- 支持批量提交

### 3. 灵活下载
- 可选择立即下载或仅创建文档
- 支持自定义标题和描述

### 4. 跨域支持
- 支持所有域名的跨域请求
- 自动处理 OPTIONS 预检请求

## 环境配置

### CORS 配置

可以通过环境变量配置允许的域名：

```bash
# .env
CORS_ORIGIN=https://yourdomain.com
```

如果不设置，默认允许所有域名（`*`）。

## 注意事项

1. **安全性**: 生产环境建议设置具体的 `CORS_ORIGIN` 而不是 `*`
2. **性能**: 大量链接建议分批提交
3. **错误处理**: 建议实现重试机制
4. **监控**: 可以通过 `documentId` 或 `taskId` 跟踪任务状态

## 状态跟踪

如果启用了立即下载，可以通过以下方式跟踪状态：

1. **文档状态**: 通过 `documentId` 查询文档状态
2. **任务状态**: 通过 `taskId` 查询下载任务状态
3. **SSE 监听**: 可以监听 `/api/download/status/{taskId}` 获取实时进度
