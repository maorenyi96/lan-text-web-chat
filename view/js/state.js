/**
 * state.js - 全局状态和连接状态管理模块
 * 此文件负责管理应用程序的全局状态，包括用户名、当前房间消息、存在的房间列表等。
 * 同时处理连接状态的显示和隐藏逻辑。
 */
// 当前用户名，全局状态变量
export let username = "";
// 当前房间的消息历史
export let currentRoomMessages = [];
// 当前存在的房间列表（用于清理策略）
export let existingRooms = ["lobby"];
// 是否正在创建房间的标志
export let isCreatingRoom = false;
// 上次连接范围，用于管理连接状态显示
let lastConnectionScope = null;
/**
 * 设置用户名
 * @param {string} newUsername - 新用户名
 */
export function setUsername(newUsername) {
  username = newUsername;
}
/**
 * 获取当前用户名
 * @returns {string} 当前用户名
 */
export function getUsername() {
  return username;
}
/**
 * 设置当前房间消息
 * @param {Array} messages - 消息数组
 */
export function setCurrentRoomMessages(messages) {
  currentRoomMessages = messages;
}
/**
 * 获取当前房间消息
 * @returns {Array} 当前房间消息数组
 */
export function getCurrentRoomMessages() {
  return currentRoomMessages;
}
/**
 * 添加消息到当前房间
 * @param {Object} message - 消息对象
 */
export function addCurrentRoomMessage(message) {
  currentRoomMessages.push(message);
}
/**
 * 设置存在的房间列表
 * @param {Array<string>} rooms - 房间列表
 */
export function setExistingRooms(rooms) {
  existingRooms = rooms;
}
/**
 * 获取存在的房间列表
 * @returns {Array<string>} 存在的房间列表
 */
export function getExistingRooms() {
  return existingRooms;
}
/**
 * 设置正在创建房间的标志
 * @param {boolean} creating - 是否正在创建
 */
export function setIsCreatingRoom(creating) {
  isCreatingRoom = creating;
}
/**
 * 获取正在创建房间的标志
 * @returns {boolean} 是否正在创建房间
 */
export function getIsCreatingRoom() {
  return isCreatingRoom;
}
/**
 * 将毫秒数转换为秒数，至少为1秒
 * @param {number} ms - 毫秒数
 * @returns {number} 秒数
 */
function secondsFromMs(ms) {
  return Math.max(1, Math.round((ms || 0) / 1000));
}
/**
 * 显示连接状态信息
 * @param {string} text - 要显示的文本
 * @param {string} scope - 连接范围 ('lobby' 或 'room')
 */
export function showConnectionStatus(text, scope) {
  const el = document.getElementById("connectionStatus");
  if (!el) return;
  if (
    scope === "lobby" ||
    !lastConnectionScope ||
    lastConnectionScope !== "lobby"
  ) {
    el.textContent = text;
    el.hidden = false;
    el.classList.add("is-visible");
    lastConnectionScope = scope;
  }
}
/**
 * 隐藏连接状态信息
 * @param {string} scope - 连接范围 ('lobby' 或 'room')
 */
export function hideConnectionStatus(scope) {
  const el = document.getElementById("connectionStatus");
  if (!el) return;
  if (scope === lastConnectionScope) {
    el.textContent = "";
    el.hidden = true;
    el.classList.remove("is-visible");
    lastConnectionScope = null;
  }
}
/**
 * 处理连接状态变化事件
 * 根据事件状态显示或隐藏连接状态信息
 * @param {Object} evt - 连接事件对象，包含state、scope、delay等属性
 */
export function handleConnectionEvent(evt) {
  if (!evt || !evt.state) return;
  // 如果正在重连，显示重连提示
  if (evt.state === "reconnecting") {
    const scope = evt.scope === "lobby" ? "大厅" : "房间";
    showConnectionStatus(
      `${scope}连接中断，${secondsFromMs(evt.delay)}秒后重试...`,
      evt.scope
    );
    return;
  }
  // 如果连接成功，隐藏状态信息
  if (evt.state === "connected") {
    hideConnectionStatus(evt.scope);
  }
}
