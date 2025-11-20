/**
 * user.js - 用户名管理模块
 * 此文件负责用户名验证、设置和确认逻辑。
 * 处理用户名的本地存储和相关UI交互。
 */
import { STORAGE_KEY, TEXT, errorText } from "./config.js";
import { $, on, validName } from "./utils.js";
import { statusMessage } from "./messages.js";
import { setUsername, getUsername } from "./state.js";
/**
 * 确保用户名已设置，如果未设置则尝试自动确认或提示用户输入
 * @param {Object} options - 配置选项
 * @param {boolean} options.autoConfirm - 是否自动确认用户名（默认为true）
 * @param {Transport} [options.transport] - 可选的Transport实例，用于发送重命名消息
 * @returns {boolean} 如果用户名已设置返回true，否则返回false
 */
export function ensureUsername({ autoConfirm = true, transport } = {}) {
  // 如果用户名已存在，直接返回true
  if (getUsername()) return true;
  // 获取用户名输入框的值
  const el = $("username");
  const val = (el && el.value ? el.value : "").trim();
  // 如果启用自动确认且有值，则确认用户名
  if (autoConfirm && val) {
    confirmUsername(transport);
    return true;
  }
  // 显示提示信息并聚焦输入框
  statusMessage(TEXT.enterUsername);
  if (el) el.focus();
  return false;
}
/**
 * 确认并设置用户名，执行验证并处理连接逻辑
 * 如果用户名有效且改变，则更新全局状态并连接到聊天系统
 * @param {Transport} [transport] - 可选的Transport实例，用于发送重命名消息
 * @returns {boolean} 如果用户名被成功更改返回true，否则返回false
 */
export function confirmUsername(transport) {
  // 获取并清理用户名输入
  const input = $("username");
  const newName = input.value.trim();
  // 检查用户名是否为空
  if (!newName) {
    statusMessage(TEXT.enterUsername);
    try {
      input.focus();
    } catch (_) {}
    return false;
  }
  // 检查用户名格式是否有效
  else if (!validName(newName)) {
    statusMessage(errorText("bad_username"));
    try {
      input.focus();
    } catch (_) {}
    return false;
  }
  // 如果用户名改变，更新状态并连接
  else if (newName !== getUsername()) {
    setUsername(newName);
    // 保存到本地存储
    try {
      localStorage.setItem(STORAGE_KEY, getUsername());
    } catch (_) {}
    // 成功修改用户名后，让输入框失焦避免多次触发
    try {
      input.blur();
    } catch (_) {}
    // 如果提供了transport且连接打开，发送重命名消息
    if (
      transport &&
      transport.roomWs &&
      transport.roomWs.readyState === WebSocket.OPEN
    ) {
      transport.send({ type: "rename", username: getUsername() });
    }
    // 返回true表示用户名已更改
    return true;
  }
  // 用户名未改变
  return false;
}
/**
 * 初始化用户名相关的事件监听器
 * @param {Transport} transport - Transport实例，用于发送重命名消息
 */
export function initUserEvents(transport) {
  // 用户名输入框回车键确认
  on("username", "keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmUsername(transport);
    }
  });
  // 确认用户名按钮点击
  on("confirmUsernameBtn", "click", () => {
    confirmUsername(transport);
  });
}
/**
 * 从本地存储加载保存的用户名
 * @returns {string} 保存的用户名，如果没有则返回空字符串
 */
export function loadSavedUsername() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (_) {
    return "";
  }
}
