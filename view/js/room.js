/**
 * room.js - 房间管理模块
 * 此文件负责房间相关逻辑，包括房间代码获取、连接状态检查、历史消息加载等。
 * 处理房间切换和消息历史管理。
 */
import { LOBBY_ROOM } from "./config.js";
import { $ } from "./utils.js";
import { loadRoomMessages, saveRoomMessages } from "./storage.js";
import {
  setCurrentRoomMessages,
  getCurrentRoomMessages,
  addCurrentRoomMessage,
  getUsername,
} from "./state.js";
import { addMessage, clearMessages } from "./messages.js";
import { resetRoomView } from "./ui-panels.js";
/**
 * 获取房间代码输入框的值
 * @returns {string} 房间代码
 */
export function roomCodeValue() {
  const el = $("roomCode");
  return el ? el.value.trim() : "";
}
/**
 * 检查房间连接是否打开
 * @param {Object} transport - Transport实例
 * @returns {boolean} 房间连接状态
 */
export function isRoomOpen(transport) {
  return (
    transport &&
    transport.roomWs &&
    transport.roomWs.readyState === WebSocket.OPEN
  );
}
/**
 * 加载房间的历史消息
 * @param {string} roomId - 房间ID
 */
export function loadRoomHistory(roomId) {
  try {
    const messages = loadRoomMessages(roomId);
    if (messages && messages.length > 0) {
      clearMessages();
      // 显示历史消息
      messages.forEach((m) => addMessage(m, getUsername()));
      setCurrentRoomMessages(messages);
    } else {
      setCurrentRoomMessages([]);
    }
  } catch (error) {
    console.warn(`加载房间历史消息失败: ${roomId}`, error);
    setCurrentRoomMessages([]);
  }
}
/**
 * 保存当前房间消息
 * @param {string} roomId - 房间ID
 */
export function saveCurrentRoomMessages(roomId) {
  try {
    saveRoomMessages(roomId, getCurrentRoomMessages());
  } catch (error) {
    console.warn(`保存房间消息失败: ${roomId}`, error);
  }
}
/**
 * 添加消息到当前房间并保存
 * @param {Object} message - 消息对象
 * @param {string} roomId - 房间ID
 */
export function addMessageToCurrentRoom(message, roomId) {
  addCurrentRoomMessage(message);
  saveCurrentRoomMessages(roomId);
}
/**
 * 处理房间切换
 * @param {string} roomId - 新房间ID
 */
export function handleRoomSwitch(roomId) {
  // 切换房间时清除当前消息并重新渲染新房间的历史消息
  resetRoomView(roomId, LOBBY_ROOM, getUsername(), { clearMessages: true });
  // 加载新房间的历史消息
  loadRoomHistory(roomId);
}
