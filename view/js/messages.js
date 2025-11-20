/**
 * messages.js - 消息处理和显示模块
 * 此文件负责消息的显示、进度条管理、状态消息处理和自动调整文本区域大小。
 * 核心消息添加逻辑，导入其他专用模块处理具体功能。
 */
import { isoNow } from "./utils.js";
import { MAX_MESSAGES } from "./config.js";
import {
  appendMessage,
  buildStatusMessageNode,
  buildChatMessageNode,
} from "./msg-renderer.js";
// 新消息计数
let newMsgCount = 0;
// 进度条隐藏定时器
let progressHideTimer = null;
/**
 * 显示新消息提示
 */
function showNewMsgTip() {
  const tip = document.getElementById("newMsgTip");
  if (!tip) return;

  newMsgCount += 1;
  const label = tip.querySelector(".new-msg-tip-label");
  if (label) {
    // 根据新消息数量更新提示文本
    label.textContent =
      newMsgCount === 1 ? "new 新消息" : `new 新消息(${newMsgCount})`;
  }
  tip.style.display = "inline-flex";
}
/**
 * 隐藏新消息提示
 */
export function hideNewMsgTip() {
  const tip = document.getElementById("newMsgTip");
  if (!tip) return;
  newMsgCount = 0;
  tip.style.display = "none";
  const label = tip.querySelector(".new-msg-tip-label");
  if (label) label.textContent = "new 新消息";
}
/**
 * 确保进度条元素存在，如果不存在则创建
 * @returns {HTMLElement|null} 进度条元素或null
 */
function ensureProgress() {
  let box = document.getElementById("uploadProgress");
  if (!box) {
    const controls = document.querySelector(".chat-controls");
    if (!controls) return null;
    box = document.createElement("div");
    box.id = "uploadProgress";
    box.className = "upload-progress";
    const track = document.createElement("div");
    track.className = "track";
    const bar = document.createElement("div");
    bar.className = "bar";
    track.appendChild(bar);
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "0%";
    box.appendChild(track);
    box.appendChild(label);
    controls.appendChild(box);
  }
  return box;
}
/**
 * 设置进度条显示
 * @param {number} pct - 进度百分比 (0-100)
 * @param {string} text - 显示文本
 */
export function setProgress(pct, text) {
  const box = ensureProgress();
  if (!box) return;
  clearProgressTimer();
  const bar = box.querySelector(".bar");
  const label = box.querySelector(".label");
  const v = Math.max(0, Math.min(100, pct | 0));
  if (bar) bar.style.width = v + "%";
  if (label)
    label.textContent =
      typeof text === "string" && text.length ? text : v + "%";
  box.style.display = "inline-flex";
}
/**
 * 隐藏进度条
 * @param {number} delay - 延迟毫秒数
 * @param {string} finalText - 最终显示文本
 */
export function hideProgress(delay = 600, finalText) {
  const box = document.getElementById("uploadProgress");
  if (!box) return;
  const bar = box.querySelector(".bar");
  const label = box.querySelector(".label");
  if (typeof finalText === "string" && label) label.textContent = finalText;
  clearProgressTimer();
  progressHideTimer = setTimeout(() => {
    if (!box) return;
    box.style.display = "none";
    if (bar) bar.style.width = "0%";
    if (label) label.textContent = "0%";
    progressHideTimer = null;
  }, delay);
}
/**
 * 清除进度条隐藏定时器
 */
function clearProgressTimer() {
  if (progressHideTimer) {
    clearTimeout(progressHideTimer);
    progressHideTimer = null;
  }
}
/**
 * 添加消息到界面
 * @param {Object} m - 消息对象
 * @param {string} currentUsername - 当前用户名
 */
export function addMessage(m, currentUsername) {
  const el = document.getElementById("messages");
  const threshold = 24;
  // 检查用户是否滚动到底部
  const wasAtBottom =
    el && el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  // 检查消息数量限制，删除最旧的消息
  const messageElements = el ? el.querySelectorAll(".message") : [];
  if (messageElements.length >= MAX_MESSAGES) {
    const toRemove = messageElements.length - MAX_MESSAGES + 1;
    for (let i = 0; i < toRemove; i++) {
      if (messageElements[i]) {
        messageElements[i].remove();
      }
    }
  }
  const node =
    m.type === "status"
      ? buildStatusMessageNode(m)
      : buildChatMessageNode(m, currentUsername);
  appendMessage(el, node);
  if (wasAtBottom) {
    // 如果用户在底部，自动滚动到最新消息
    el.scrollTop = el.scrollHeight;
    hideNewMsgTip();
  } else {
    // 否则显示新消息提示
    showNewMsgTip();
  }
}
/**
 * 显示状态消息
 * @param {string} text - 消息文本
 * @param {string} currentUsername - 当前用户名
 */
export function statusMessage(text, currentUsername) {
  return addMessage({ type: "status", text, ts: isoNow() }, currentUsername);
}
/**
 * 自动调整文本区域大小
 */
export function autoResizeTextarea() {
  const ta = document.getElementById("messageInput");
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}
/**
 * 清除所有消息
 */
export function clearMessages() {
  const messagesEl = document.getElementById("messages");
  if (!messagesEl) return;
  // 直接选择并删除所有消息元素
  const messageElements = messagesEl.querySelectorAll(".message");
  for (const element of messageElements) {
    element.remove();
  }
  hideNewMsgTip();
}
