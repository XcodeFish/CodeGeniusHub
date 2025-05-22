/**
 * SVG处理相关工具函数
 */

/**
 * 将SVG字符串转换为可以在img标签中使用的Data URI
 * @param svgString SVG字符串
 * @returns 可用于img标签src属性的Data URI字符串
 */
export function svgToDataUri(svgString: string): string {
  try {
    // 首先尝试直接转换为base64
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('SVG转换失败:', error);
    
    // 降级处理：进行URL编码
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
      
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }
} 