/**
 * sender.js - 消息发送模块
 * 此文件负责文本消息和文件消息的发送逻辑。
 * 处理消息验证、文件读取和WebSocket发送。
 */
import { MAX_MESSAGE_BYTES, TEXT, allowedFileOriginalBytes } from "./config.js";
import { fmtBytes, utf8ByteLength } from "./utils.js";
import {
  statusMessage,
  setProgress,
  hideProgress,
  autoResizeTextarea,
} from "./messages.js";
import { ensureUsername } from "./user.js";
import { isRoomOpen } from "./room.js";
/**
 * 发送文本消息，执行验证并通过WebSocket发送
 * @param {Object} transport - Transport实例
 */
export function sendText(transport) {
  // 获取消息输入框的值
  const input = document.getElementById("messageInput");
  const v = input.value.trim();
  // 确保用户名已设置
  if (!ensureUsername({ autoConfirm: false, transport })) return;
  // 检查房间连接是否打开
  if (!isRoomOpen(transport)) {
    statusMessage(TEXT.sendFail);
    return;
  }
  // 检查消息是否为空
  if (!v) return;
  // 检查消息字节长度是否超过限制
  const bytes = utf8ByteLength(v);
  if (bytes > MAX_MESSAGE_BYTES) {
    statusMessage(TEXT.textTooLong(bytes, MAX_MESSAGE_BYTES, fmtBytes));
    return;
  }
  // 构建并发送消息（不本地显示，等待服务器回显）
  const msg = { type: "text", text: v };
  transport.send(msg);
  // 延迟清除输入框，确保消息发送成功
  const clearIfOpen = () => {
    if (transport.roomWs && transport.roomWs.readyState === WebSocket.OPEN) {
      input.value = "";
      // 自动调整文本框大小
      autoResizeTextarea();
      return true;
    }
    return false;
  };
  if (!clearIfOpen()) setTimeout(clearIfOpen, 400);
}
/**
 * 发送文件消息，使用FileReader读取文件并通过WebSocket发送
 * 执行文件大小验证和进度显示
 * @param {File} file - 要发送的文件对象
 * @param {Object} transport - Transport实例
 */
export function sendFile(file, transport) {
  // 检查文件是否存在
  if (!file) return;
  // 确保用户名已设置
  if (!ensureUsername({ autoConfirm: false, transport })) return;
  // 检查房间连接是否打开
  if (!isRoomOpen(transport)) {
    statusMessage(TEXT.sendFail);
    return;
  }
  // 检查文件大小是否超过限制
  const allowed = allowedFileOriginalBytes();
  if (typeof file.size === "number" && file.size > allowed) {
    const maxMB = Math.round(allowed / (1024 * 1024));
    statusMessage(TEXT.fileTooLarge(maxMB));
    return;
  }
  // 创建FileReader实例
  const reader = new FileReader();
  // 开始读取时显示进度
  reader.onloadstart = () => setProgress(1, "1%...");
  // 读取进度更新
  reader.onprogress = (e) => {
    if (e && e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      setProgress(pct, pct + "%...");
    }
  };
  // 文件读取完成，构建消息并发送（不本地显示，等待服务器回显）
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const msg = {
      type: "file",
      name: file.name,
      mime: file.type || "",
      size: typeof file.size === "number" ? file.size : undefined,
      data: dataUrl,
    };
    // 检查消息总大小是否超过限制
    const jsonBytes = utf8ByteLength(JSON.stringify(msg));
    if (jsonBytes > MAX_MESSAGE_BYTES) {
      hideProgress(1200, TEXT.exceedLimit);
      statusMessage(TEXT.msgTooLarge(jsonBytes, MAX_MESSAGE_BYTES, fmtBytes));
      return;
    }
    // 显示发送进度并发送消息
    setProgress(100, "发送中...");
    transport.send(msg);
    hideProgress(800);
  };
  // 读取失败时隐藏进度
  reader.onerror = () => {
    hideProgress(1200, TEXT.readFail);
  };
  // 开始读取文件为Data URL
  reader.readAsDataURL(file);
}
/**
 * 处理粘贴事件，检查剪贴板中是否有文件，如果有则发送文件
 * @param {ClipboardEvent} ev - 粘贴事件对象
 * @param {Object} transport - Transport实例
 */
export function handlePasteEvent(ev, transport) {
  // 获取剪贴板数据项
  const items = ev.clipboardData && ev.clipboardData.items;
  if (!items) return;
  // 检查WebSocket连接状态
  const connected =
    transport &&
    transport.roomWs &&
    transport.roomWs.readyState === WebSocket.OPEN;
  // 遍历剪贴板项，查找文件
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it && it.kind === "file") {
      const file = it.getAsFile();
      if (file) {
        // 确保用户名已设置
        if (!ensureUsername({ autoConfirm: false, transport })) return;
        // 检查连接状态
        if (!connected) {
          statusMessage(TEXT.sendFail);
          return;
        }
        // 阻止默认行为，发送文件
        ev.preventDefault();
        sendFile(file, transport);
        // 自动调整文本框大小
        setTimeout(autoResizeTextarea, 50);
        return;
      }
    }
  }
}
