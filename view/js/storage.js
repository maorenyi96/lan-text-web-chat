/**
 * storage.js - 消息持久化存储模块
 * 此文件负责将聊天消息存储到localStorage中，支持按房间存储和检索。
 * 只存储调用方传入的需要存储的消息。
 */
import {
  STORAGE_MAX_BYTES,
  STORAGE_MAX_AGE_DAYS,
  MAX_MESSAGES,
} from "./config.js";
/**
 * 准备消息用于存储，文件消息只保留元信息
 * @param {Object} message - 原始消息对象
 * @returns {Object|null} 可存储的消息对象，如果不需要存储返回null
 */
function prepareMessageForStorage(message) {
  if (message.type === "text" || message.type === "status") {
    // 文本和状态消息完整存储
    return message;
  }
  if (message.type === "file") {
    // 文件消息只存储元信息，不存储数据
    const { data, ...metaOnly } = message;
    return metaOnly;
  }
  // 其他类型的消息不存储
  return null;
}
/**
 * 存储键名前缀
 */
const STORAGE_PREFIX = "lanchat_room_";
/**
 * 存储版本号，用于处理数据结构变更
 */
const STORAGE_VERSION = 1;
/**
 * 获取房间的存储键名
 * @param {string} roomId - 房间ID
 * @returns {string} 存储键名
 */
function getStorageKey(roomId) {
  return STORAGE_PREFIX + roomId;
}
/**
 * 从localStorage加载房间消息
 * @param {string} roomId - 房间ID
 * @returns {Array} 消息数组（最多返回 MAX_MESSAGES 条最近的消息）
 */
export function loadRoomMessages(roomId) {
  try {
    const key = getStorageKey(roomId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const data = JSON.parse(stored);
    // 检查版本兼容性
    if (!data.version || data.version !== STORAGE_VERSION) {
      console.warn(`存储版本不匹配，清除旧数据: ${roomId}`);
      localStorage.removeItem(key);
      return [];
    }
    const allMessages = data.messages || [];
    // 只返回最近的 MAX_MESSAGES 条消息，避免界面过大
    if (allMessages.length > MAX_MESSAGES) {
      return allMessages.slice(-MAX_MESSAGES);
    }
    return allMessages;
  } catch (error) {
    console.warn(`加载房间消息失败: ${roomId}`, error);
    return [];
  }
}
/**
 * 保存房间消息到localStorage
 * @param {string} roomId - 房间ID
 * @param {Array} messages - 所有消息数组（内部会过滤需要存储的消息）
 */
export function saveRoomMessages(roomId, messages) {
  try {
    // 准备所有消息用于存储，过滤掉不需要存储的消息
    const storableMessages = messages
      .map(prepareMessageForStorage)
      .filter((message) => message !== null);
    let finalMessages = storableMessages;
    const key = getStorageKey(roomId);
    // 预估存储大小
    const data = {
      version: STORAGE_VERSION,
      roomId: roomId,
      messages: finalMessages,
      timestamp: Date.now(),
    };
    let jsonString = JSON.stringify(data);
    let currentUsage = getStorageUsage();
    let newSize = jsonString.length * 2; // UTF-16每个字符2字节
    // 如果存储空间不足，优先清理过期数据
    if (currentUsage + newSize > STORAGE_MAX_BYTES) {
      console.warn(`存储空间不足，尝试清理过期数据: ${roomId}`);
      cleanupExpiredData(); // 清理过期数据
      // 重新计算存储大小
      currentUsage = getStorageUsage();
      newSize = jsonString.length * 2;
      // 如果清理后还是不够，保留最近50%的消息
      if (currentUsage + newSize > STORAGE_MAX_BYTES) {
        console.warn(`清理后仍空间不足，保留最近50%的消息: ${roomId}`);
        const keepCount = Math.floor(finalMessages.length * 0.5);
        finalMessages = finalMessages.slice(-keepCount);
        // 重新构建数据
        data.messages = finalMessages;
        jsonString = JSON.stringify(data);
      }
    }
    localStorage.setItem(key, jsonString);
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn(`存储空间不足，无法保存房间消息: ${roomId}`);
      // 不直接清除当前房间，让调用方处理更高级的清理策略
      throw error; // 重新抛出错误，让调用方处理
    } else {
      console.warn(`保存房间消息失败: ${roomId}`, error);
    }
  }
}
/**
 * 获取localStorage使用情况
 * @returns {number} 已使用的字节数
 */
export function getStorageUsage() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16
    }
  }
  return total;
}
/**
 * 清理不存在的房间数据
 * @param {Array<string>} existingRooms - 当前存在的房间列表
 * @param {string} currentRoom - 当前房间ID（需要保留）
 */
export function cleanupNonExistentRooms(existingRooms, currentRoom) {
  try {
    const existingRoomSet = new Set(existingRooms);
    // 保留当前房间，即使它不在服务器列表中
    existingRoomSet.add(currentRoom);
    const keysToRemove = [];
    for (let key in localStorage) {
      if (key.startsWith(STORAGE_PREFIX)) {
        const roomId = key.substring(STORAGE_PREFIX.length);
        if (!existingRoomSet.has(roomId)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`清理不存在的房间数据: ${key}`);
    });
    if (keysToRemove.length > 0) {
      console.log(`清理了 ${keysToRemove.length} 个不存在的房间数据`);
    }
  } catch (error) {
    console.warn("清理不存在的房间数据失败:", error);
  }
}
/**
 * 清理所有过期的房间数据
 * @param {number} maxAge - 最大年龄（毫秒），默认7天
 */
export function cleanupExpiredData(
  maxAge = STORAGE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
) {
  try {
    const now = Date.now();
    const keysToRemove = [];
    for (let key in localStorage) {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage[key]);
          if (data.timestamp && now - data.timestamp > maxAge) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // 如果解析失败，可能是旧格式，删除
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`清理过期数据: ${key}`);
    });
    if (keysToRemove.length > 0) {
      console.log(`清理了 ${keysToRemove.length} 个过期房间数据`);
    }
  } catch (error) {
    console.warn("清理过期数据失败:", error);
  }
}
