// 解析FOLO的XML 文本

export function parsePost(xml: string) {
  const getValue = (tag: string): string | null => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = xml.match(regex);
    if (!match) return null;

    // 转义处理: \n → 换行, \t → tab, \r → 回车
    return match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .trim();
  };

  return {
    title: getValue("title"),
    content_markdown: getValue("content_markdown"),
    summary: getValue("summary"),
  };
}



