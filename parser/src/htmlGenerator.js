import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Generate HTML file from parsed messages
 */

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert URLs in text to clickable links
 */
function linkifyText(text) {
  if (!text) return '';

  // Escape HTML first
  text = escapeHtml(text);

  // URL regex pattern - matches http://, https://, and www. URLs
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  // Replace URLs with clickable links
  text = text.replace(urlPattern, (url) => {
    let href = url;
    // Add https:// if URL starts with www.
    if (url.startsWith('www.')) {
      href = 'https://' + url;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return text;
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date for divider
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Get date key for grouping
 */
function getDateKey(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * Generate message HTML
 */
function generateMessageHtml(message) {
  const messageClass = message.type === 'system' ? 'message system' : 'message';
  let html = `<div class="${messageClass}">\n`;
  html += '  <div class="message-bubble">\n';

  // Sender name (for non-system messages)
  if (message.type !== 'system') {
    html += `    <div class="sender">${escapeHtml(message.sender)}</div>\n`;
  }

  // Message content
  if (message.content && message.content.trim()) {
    // Remove <attached: ...> tags and (file attached) patterns from content since we display media separately
    let cleanContent = message.content
      .replace(/<attached:[^>]+>/g, '')
      .replace(/^.+?\.(jpg|jpeg|png|gif|webp|mp4|avi|mov|mkv|opus|mp3|ogg|aac|m4a|pdf|doc|docx|xls|xlsx) \(file attached\)/gi, '')
      .trim();

    // Only show content if there's text after removing attachment tags
    if (cleanContent) {
      // Linkify first, then replace newlines with <br>
      const content = linkifyText(cleanContent).replace(/\n/g, '<br>');
      html += `    <div class="content">${content}</div>\n`;
    }
  }

  // Media
  if (message.media && message.media.filename) {
    const { filename, mediaType } = message.media;
    const mediaPath = `media/${filename}`;

    if (mediaType === 'image') {
      html += `    <div class="media">\n`;
      html += `      <img src="${mediaPath}" alt="${escapeHtml(filename)}" onclick="viewImage('${mediaPath}')">\n`;
      html += `    </div>\n`;
    } else if (mediaType === 'audio') {
      html += `    <div class="media">\n`;
      html += `      <audio controls>\n`;
      html += `        <source src="${mediaPath}" type="audio/opus">\n`;
      html += `        <source src="${mediaPath}" type="audio/mpeg">\n`;
      html += `        Your browser does not support audio playback.\n`;
      html += `      </audio>\n`;
      html += `    </div>\n`;
    } else if (mediaType === 'video') {
      html += `    <div class="media video-placeholder">\n`;
      html += `      <a href="${mediaPath}" class="video-link" target="_blank">\n`;
      html += `        <div class="video-thumbnail">\n`;
      html += `          <div class="play-icon">▶</div>\n`;
      html += `          <div class="video-info">🎥 ${escapeHtml(filename)}</div>\n`;
      html += `        </div>\n`;
      html += `      </a>\n`;
      html += `    </div>\n`;
    } else {
      // Document or other
      html += `    <div class="media document">\n`;
      html += `      <a href="${mediaPath}" download="${escapeHtml(filename)}">\n`;
      html += `        📄 ${escapeHtml(filename)}\n`;
      html += `      </a>\n`;
      html += `    </div>\n`;
    }
  }

  // Timestamp (for non-system messages)
  if (message.type !== 'system') {
    html += `    <div class="time">${formatTime(message.timestamp)}</div>\n`;
  }

  html += '  </div>\n';
  html += '</div>\n';

  return html;
}

/**
 * Generate complete HTML file
 */
export async function generateHtmlFile(messages, metadata, outputDir) {
  // Group messages by date
  const messagesByDate = {};
  messages.forEach(msg => {
    const dateKey = getDateKey(msg.timestamp);
    if (!messagesByDate[dateKey]) {
      messagesByDate[dateKey] = [];
    }
    messagesByDate[dateKey].push(msg);
  });

  // Sort dates chronologically
  const dateKeys = Object.keys(messagesByDate).sort();

  // Start building HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>${escapeHtml(metadata.chatName)} - WhatsApp Chat</title>
  <style>
    :root {
      --whatsapp-green: #075e54;
      --whatsapp-light-green: #128c7e;
      --whatsapp-teal: #25d366;
      --whatsapp-bg: #e5ddd5;
      --message-received: #ffffff;
      --text-primary: #000000;
      --text-secondary: #667781;
      --border-color: #d1d7db;
      --font-size: 15px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: var(--whatsapp-bg);
      background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M50 10 L60 20 L50 30 L40 20 Z" fill="%23d9d9d9" opacity="0.05"/></pattern></defs><rect fill="url(%23pattern)" x="0" y="0" width="100" height="100"/></svg>');
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .header {
      background: var(--whatsapp-green);
      color: white;
      padding: 16px 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .header h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 500;
    }

    .header .info {
      font-size: 13px;
      opacity: 0.9;
    }

    /* Toolbar */
    .toolbar {
      background: #f0f2f5;
      padding: 10px 16px;
      display: flex;
      gap: 8px;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .toolbar button {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toolbar button:hover {
      background: var(--whatsapp-light-green);
      color: white;
      border-color: var(--whatsapp-light-green);
    }

    .toolbar button:active {
      transform: scale(0.95);
    }

    /* Messages container */
    .messages-container {
      flex: 1;
      overflow-y: scroll;
      overflow-x: hidden;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      scrollbar-gutter: stable;
    }

    /* Date divider */
    .date-divider {
      text-align: center;
      margin: 16px 0;
    }

    .date-divider span {
      background: #e1f3fb;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      display: inline-block;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    /* Message */
    .message {
      margin: 4px 0;
      display: flex;
      align-items: flex-end;
    }

    .message-bubble {
      background: var(--message-received);
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 75%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      position: relative;
      word-wrap: break-word;
    }

    .message-bubble::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: -8px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 0 10px 10px;
      border-color: transparent transparent var(--message-received) transparent;
    }

    .sender {
      font-weight: 600;
      color: var(--whatsapp-light-green);
      font-size: calc(var(--font-size) - 1px);
      margin-bottom: 4px;
    }

    .content {
      font-size: var(--font-size);
      line-height: 1.5;
      color: var(--text-primary);
      margin: 4px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .content a {
      color: #039be5;
      text-decoration: underline;
      word-break: break-all;
      cursor: pointer;
    }

    .content a:hover {
      color: #0277bd;
    }

    .content a:visited {
      color: #7e57c2;
    }

    .time {
      font-size: 11px;
      color: var(--text-secondary);
      text-align: right;
      margin-top: 4px;
    }

    /* Media */
    .media {
      margin: 8px 0;
    }

    .media img {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
      cursor: pointer;
      display: block;
      transition: opacity 0.2s;
    }

    .media img:hover {
      opacity: 0.9;
    }

    .media audio {
      max-width: 100%;
      display: block;
      border-radius: 8px;
    }

    /* Video placeholder */
    .media.video-placeholder {
      margin: 8px 0;
    }

    .video-link {
      display: block;
      text-decoration: none;
      color: inherit;
    }

    .video-thumbnail {
      position: relative;
      background: linear-gradient(135deg, #667781 0%, #54656f 100%);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid #d1d7db;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .video-thumbnail:hover {
      background: linear-gradient(135deg, #54656f 0%, #42545c 100%);
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .play-icon {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: var(--whatsapp-light-green);
      transition: all 0.3s ease;
      padding-left: 4px;
    }

    .video-thumbnail:hover .play-icon {
      background: white;
      transform: scale(1.1);
    }

    .video-info {
      color: white;
      font-size: 13px;
      font-weight: 500;
      word-break: break-word;
      max-width: 100%;
    }

    .media.document a {
      color: var(--whatsapp-light-green);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f0f2f5;
      border-radius: 8px;
    }

    .media.document a:hover {
      background: #e5e7eb;
    }

    /* System messages */
    .message.system {
      justify-content: center;
    }

    .message.system .message-bubble {
      background: #e1f3fb;
      max-width: 90%;
      font-size: calc(var(--font-size) - 2px);
      color: var(--text-secondary);
      text-align: center;
    }

    .message.system .message-bubble::before {
      display: none;
    }

    /* Search box */
    .search-container {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 12px 16px;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      z-index: 1000;
      min-width: 300px;
    }

    .search-container.active {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .search-container input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
      padding: 4px 8px;
    }

    .search-container button {
      background: var(--whatsapp-light-green);
      color: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .search-container button:hover {
      background: var(--whatsapp-green);
    }

    .search-container .search-info {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    /* Search highlight */
    mark {
      background: #ffeb3b;
      color: black;
      padding: 2px;
      border-radius: 2px;
    }

    mark.current {
      background: #ff9800;
    }

    /* Date picker */
    .date-picker-container {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      z-index: 1000;
      gap: 10px;
      align-items: center;
    }

    .date-picker-container.active {
      display: flex;
    }

    .date-picker-container label {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .date-picker-container input[type="date"] {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }

    .date-picker-container input[type="date"]:focus {
      border-color: var(--whatsapp-light-green);
    }

    .date-picker-container button {
      background: var(--whatsapp-light-green);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .date-picker-container button:hover {
      background: var(--whatsapp-green);
    }

    .date-picker-container button:last-child {
      background: #f44336;
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .date-picker-container button:last-child:hover {
      background: #d32f2f;
    }

    /* Scrollbar */
    .messages-container::-webkit-scrollbar {
      width: 12px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.05);
      border-radius: 6px;
      margin: 4px 0;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.4);
      border-radius: 6px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: rgba(0,0,0,0.6);
      background-clip: padding-box;
    }

    .messages-container::-webkit-scrollbar-thumb:active {
      background: var(--whatsapp-light-green);
      background-clip: padding-box;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .header h1 {
        font-size: 16px;
      }

      .message-bubble {
        max-width: 85%;
      }

      .toolbar {
        overflow-x: auto;
        white-space: nowrap;
      }

      .toolbar button {
        font-size: 13px;
        padding: 6px 12px;
      }
    }

    /* Desktop layout */
    @media (min-width: 769px) {
      body {
        background: linear-gradient(to bottom, var(--whatsapp-green) 0%, var(--whatsapp-green) 15%, var(--whatsapp-bg) 15%);
      }

      .chat-wrapper {
        max-width: 1000px;
        margin: 20px auto;
        height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 16px rgba(0,0,0,0.2);
      }

      body > .header,
      body > .toolbar,
      body > .messages-container {
        max-width: 1000px;
        margin-left: auto;
        margin-right: auto;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(metadata.chatName)}</h1>
    <div class="info">
      ${metadata.messageCount} messages • ${metadata.participants?.length || 0} participants
    </div>
  </div>

  <div class="toolbar">
    <button onclick="decreaseFont()" title="Decrease font size">A-</button>
    <button onclick="increaseFont()" title="Increase font size">A+</button>
    <button onclick="toggleSearch()" title="Search in chat">🔍 Search</button>
    <button onclick="toggleDatePicker()" title="Jump to date">📅 Jump to Date</button>
    <button onclick="scrollToBottom()" title="Go to bottom">⬇ Latest</button>
  </div>

  <div class="search-container" id="searchContainer">
    <input type="text" id="searchInput" placeholder="Search messages..." autocomplete="off">
    <button onclick="searchPrev()" title="Previous">↑</button>
    <button onclick="searchNext()" title="Next">↓</button>
    <span class="search-info" id="searchInfo"></span>
    <button onclick="closeSearch()" title="Close">✕</button>
  </div>

  <div class="date-picker-container" id="datePickerContainer">
    <label for="dateInput">Jump to date:</label>
    <input type="date" id="dateInput" min="${metadata.dateRange.start}" max="${metadata.dateRange.end}">
    <button onclick="jumpToDate()" title="Go">Go</button>
    <button onclick="closeDatePicker()" title="Close">✕</button>
  </div>

  <div class="messages-container" id="messagesContainer">
`;

  // Generate messages grouped by date
  dateKeys.forEach(dateKey => {
    const dateMessages = messagesByDate[dateKey];

    // Add date divider with data-date attribute for jump-to-date functionality
    html += `    <div class="date-divider" data-date="${dateKey}"><span>${formatDate(dateMessages[0].timestamp)}</span></div>\n\n`;

    // Add messages for this date
    dateMessages.forEach(msg => {
      html += generateMessageHtml(msg);
    });
  });

  // Close HTML
  html += `
  </div>

  <script>
    // Font size control
    let currentFontSize = 15;
    const minFontSize = 12;
    const maxFontSize = 24;

    function increaseFont() {
      if (currentFontSize < maxFontSize) {
        currentFontSize += 2;
        document.documentElement.style.setProperty('--font-size', currentFontSize + 'px');
        localStorage.setItem('chatFontSize', currentFontSize);
      }
    }

    function decreaseFont() {
      if (currentFontSize > minFontSize) {
        currentFontSize -= 2;
        document.documentElement.style.setProperty('--font-size', currentFontSize + 'px');
        localStorage.setItem('chatFontSize', currentFontSize);
      }
    }

    // Search functionality
    let searchMatches = [];
    let currentMatchIndex = -1;
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    const searchInfo = document.getElementById('searchInfo');

    function toggleSearch() {
      if (searchContainer.classList.contains('active')) {
        closeSearch();
      } else {
        searchContainer.classList.add('active');
        searchInput.focus();
      }
    }

    function closeSearch() {
      searchContainer.classList.remove('active');
      clearSearchHighlights();
      searchInput.value = '';
      searchInfo.textContent = '';
    }

    function clearSearchHighlights() {
      const marks = document.querySelectorAll('mark');
      marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
      searchMatches = [];
      currentMatchIndex = -1;
    }

    function performSearch() {
      const query = searchInput.value.trim();

      if (!query) {
        clearSearchHighlights();
        searchInfo.textContent = '';
        return;
      }

      // Clear previous highlights
      clearSearchHighlights();

      // Get all text content elements
      const contentElements = document.querySelectorAll('.content');
      // Escape special regex characters - simplified approach
      let escapedQuery = query;
      const specialChars = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\\\'];
      specialChars.forEach(char => {
        escapedQuery = escapedQuery.split(char).join('\\\\' + char);
      });
      const regex = new RegExp('(' + escapedQuery + ')', 'gi');

      contentElements.forEach(element => {
        const textContent = element.textContent;

        if (regex.test(textContent)) {
          // Reset regex
          regex.lastIndex = 0;

          // Highlight matches while preserving HTML structure
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          const nodesToReplace = [];
          let node;

          while (node = walker.nextNode()) {
            if (regex.test(node.nodeValue)) {
              nodesToReplace.push(node);
            }
            regex.lastIndex = 0;
          }

          nodesToReplace.forEach(textNode => {
            const fragment = document.createDocumentFragment();
            const text = textNode.nodeValue;
            let lastIndex = 0;
            let match;

            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
              // Add text before match
              if (match.index > lastIndex) {
                fragment.appendChild(
                  document.createTextNode(text.slice(lastIndex, match.index))
                );
              }

              // Add highlighted match
              const mark = document.createElement('mark');
              mark.textContent = match[0];
              fragment.appendChild(mark);
              searchMatches.push(mark);

              lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
          });
        }
      });

      // Update info
      if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
        searchInfo.textContent = \`1 / \${searchMatches.length}\`;
      } else {
        searchInfo.textContent = 'No results';
      }
    }

    function highlightCurrentMatch() {
      searchMatches.forEach((mark, index) => {
        mark.classList.toggle('current', index === currentMatchIndex);
      });

      if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
        searchMatches[currentMatchIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }

    function searchNext() {
      if (searchMatches.length === 0) return;
      currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
      highlightCurrentMatch();
      searchInfo.textContent = \`\${currentMatchIndex + 1} / \${searchMatches.length}\`;
    }

    function searchPrev() {
      if (searchMatches.length === 0) return;
      currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
      highlightCurrentMatch();
      searchInfo.textContent = \`\${currentMatchIndex + 1} / \${searchMatches.length}\`;
    }

    // Scroll to bottom
    function scrollToBottom() {
      const container = document.getElementById('messagesContainer');
      container.scrollTop = container.scrollHeight;
    }

    // Date picker functionality
    const datePickerContainer = document.getElementById('datePickerContainer');
    const dateInput = document.getElementById('dateInput');

    function toggleDatePicker() {
      if (datePickerContainer.classList.contains('active')) {
        closeDatePicker();
      } else {
        datePickerContainer.classList.add('active');
        dateInput.focus();
      }
    }

    function closeDatePicker() {
      datePickerContainer.classList.remove('active');
      dateInput.value = '';
    }

    function jumpToDate() {
      const selectedDate = dateInput.value;

      if (!selectedDate) {
        alert('Please select a date');
        return;
      }

      // Find the date divider for this date
      const dateDividers = document.querySelectorAll('.date-divider');
      let found = false;

      for (const divider of dateDividers) {
        const dividerText = divider.textContent.trim();
        const dividerDate = divider.getAttribute('data-date');

        if (dividerDate === selectedDate) {
          divider.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          found = true;
          closeDatePicker();
          break;
        }
      }

      if (!found) {
        alert('No messages found for this date');
      }
    }

    // Image viewer
    function viewImage(src) {
      window.open(src, '_blank');
    }

    // Initialize on load
    window.addEventListener('DOMContentLoaded', function() {
      // Restore saved font size
      const savedFontSize = localStorage.getItem('chatFontSize');
      if (savedFontSize) {
        currentFontSize = parseInt(savedFontSize);
        document.documentElement.style.setProperty('--font-size', currentFontSize + 'px');
      }

      // Scroll to bottom (latest messages)
      scrollToBottom();

      // Search input handler
      searchInput.addEventListener('input', function() {
        performSearch();
      });

      // Search on Enter key
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            searchPrev();
          } else {
            searchNext();
          }
        } else if (e.key === 'Escape') {
          closeSearch();
        }
      });

      // Date picker on Enter key
      dateInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          jumpToDate();
        } else if (e.key === 'Escape') {
          closeDatePicker();
        }
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Plus: increase font
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
          e.preventDefault();
          increaseFont();
        }
        // Ctrl/Cmd + Minus: decrease font
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
          e.preventDefault();
          decreaseFont();
        }
        // Ctrl/Cmd + F: open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          toggleSearch();
        }
        // Ctrl/Cmd + G: open date picker
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
          e.preventDefault();
          toggleDatePicker();
        }
        // End key: scroll to bottom
        if (e.key === 'End' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          scrollToBottom();
        }
      });
    });
  </script>
</body>
</html>
`;

  // Write HTML file
  const htmlPath = join(outputDir, 'chat.html');
  await writeFile(htmlPath, html, 'utf-8');

  return htmlPath;
}
