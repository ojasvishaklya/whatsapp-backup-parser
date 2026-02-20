import { readFile } from 'fs/promises';

/**
 * Parse WhatsApp chat text file
 * Format: [DD/MM/YY, HH:MM:SS AM/PM] Sender: Message
 */

// Regex to match message start lines
// Format 1: [DD/MM/YY, HH:MM:SS AM/PM] Sender: Message
const MESSAGE_START_PATTERN_1 = /^\[(\d{1,2}\/\d{1,2}\/\d{2}), (\d{1,2}:\d{2}:\d{2} [AP]M)\] ([^:]+): (.*)$/;
// Format 2: D/M/YY, HH:MM AM - Sender: Message (with narrow no-break space \u202F)
const MESSAGE_START_PATTERN_2 = /^(\d{1,2}\/\d{1,2}\/\d{2}), (\d{1,2}:\d{2}[\s\u202F][AP]M) - ([^:]+): (.*)$/;
// Format 2 system messages: D/M/YY, HH:MM AM - System message (no colon)
const MESSAGE_START_PATTERN_2_SYSTEM = /^(\d{1,2}\/\d{1,2}\/\d{2}), (\d{1,2}:\d{2}[\s\u202F][AP]M) - (.+)$/;

// Regex to match media attachments
const MEDIA_ATTACHED_PATTERN = /<attached: (.+?)>/;
const MEDIA_ATTACHED_PATTERN_2 = /^(.+?\.(jpg|jpeg|png|gif|webp|mp4|avi|mov|mkv|opus|mp3|ogg|aac|m4a|pdf|doc|docx|xls|xlsx)) \(file attached\)/i;
const MEDIA_OMITTED_PATTERN = /image omitted|video omitted|audio omitted|sticker omitted|document omitted/i;

// System message patterns
const SYSTEM_MESSAGE_INDICATORS = [
  'created this group',
  'added you',
  'left',
  'removed',
  'changed the subject',
  'changed this group\'s icon',
  'Messages and calls are end-to-end encrypted'
];

/**
 * Parse date and time to ISO format
 * Handles both DD/MM/YY and M/D/YY formats
 * Input: "18/06/25", "11:52:46 AM" or "1/13/26", "12:52 AM"
 * Output: "2025-06-18T11:52:46"
 * @param {number} formatType - 1 for DD/MM/YY, 2 for M/D/YY
 */
function parseDateTime(dateStr, timeStr, formatType = 1) {
  const parts = dateStr.split('/');
  const year = parts[2];
  const fullYear = `20${year}`; // Assuming 2000s

  // Determine date format: if first part > 12, it's day (DD/MM), else check second part
  let day, month;
  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);

  if (first > 12) {
    // Format: DD/MM/YY
    day = parts[0];
    month = parts[1];
  } else if (second > 12) {
    // Format: M/DD/YY or MM/DD/YY
    month = parts[0];
    day = parts[1];
  } else {
    // Ambiguous case (both ≤ 12)
    // Format 1 (with brackets) uses DD/MM/YY
    // Format 2 (with dash separator) uses M/D/YY
    if (formatType === 2) {
      month = parts[0];
      day = parts[1];
    } else {
      day = parts[0];
      month = parts[1];
    }
  }

  // Parse time - handle both regular space and narrow no-break space (U+202F)
  let [time, period] = timeStr.split(/[\s\u202F]/);
  let timeParts = time.split(':').map(Number);
  let hours = timeParts[0];
  let minutes = timeParts[1];
  let seconds = timeParts[2] || 0; // Default to 0 if no seconds

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return isoDate;
}

/**
 * Check if a message is a system message
 */
function isSystemMessage(content) {
  return SYSTEM_MESSAGE_INDICATORS.some(indicator =>
    content.includes(indicator)
  );
}

/**
 * Determine message type and extract media info
 */
function analyzeMessage(content) {
  // Check for attached media - Format 1: <attached: filename.ext>
  const attachedMatch = content.match(MEDIA_ATTACHED_PATTERN);
  if (attachedMatch) {
    const filename = attachedMatch[1];
    const ext = filename.split('.').pop().toLowerCase();
    let mediaType = 'document';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      mediaType = 'image';
    } else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
      mediaType = 'video';
    } else if (['opus', 'mp3', 'ogg', 'aac', 'm4a'].includes(ext)) {
      mediaType = 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
      mediaType = 'document';
    }

    return {
      type: 'media',
      media: { filename, mediaType }
    };
  }

  // Check for attached media - Format 2: filename.ext (file attached)
  const attachedMatch2 = content.match(MEDIA_ATTACHED_PATTERN_2);
  if (attachedMatch2) {
    const filename = attachedMatch2[1];
    const ext = attachedMatch2[2].toLowerCase();
    let mediaType = 'document';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      mediaType = 'image';
    } else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
      mediaType = 'video';
    } else if (['opus', 'mp3', 'ogg', 'aac', 'm4a'].includes(ext)) {
      mediaType = 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
      mediaType = 'document';
    }

    return {
      type: 'media',
      media: { filename, mediaType }
    };
  }

  // Check for omitted media
  if (MEDIA_OMITTED_PATTERN.test(content)) {
    return {
      type: 'media_omitted',
      media: null
    };
  }

  // Check if system message
  if (isSystemMessage(content)) {
    return {
      type: 'system',
      media: null
    };
  }

  // Regular text message
  return {
    type: 'text',
    media: null
  };
}

/**
 * Parse the entire chat file
 */
export async function parseChatFile(filePath) {
  let content = await readFile(filePath, 'utf-8');

  // Normalize line endings (convert \r\n to \n)
  content = content.replace(/\r\n/g, '\n');

  const lines = content.split('\n');

  const messages = [];
  let currentMessage = null;
  let messageId = 0;

  for (let line of lines) {
    // Remove invisible Unicode characters (like Left-to-Right marks) and trim
    line = line.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();

    // Skip empty lines
    if (!line) continue;

    // Try all message patterns
    let match = line.match(MESSAGE_START_PATTERN_1);
    let isSystemMessage = false;
    let formatType = 1; // Default to DD/MM/YY format

    if (!match) {
      match = line.match(MESSAGE_START_PATTERN_2);
      if (match) formatType = 2; // M/D/YY format
    }

    if (!match) {
      // Try system message pattern (Format 2 without colon)
      match = line.match(MESSAGE_START_PATTERN_2_SYSTEM);
      if (match) {
        isSystemMessage = true;
        formatType = 2; // M/D/YY format
      }
    }

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      // Start new message
      if (isSystemMessage) {
        // System message format: date, time, content (no sender)
        const [, dateStr, timeStr, messageContent] = match;
        const timestamp = parseDateTime(dateStr, timeStr, formatType);

        currentMessage = {
          id: `msg_${++messageId}`,
          timestamp,
          sender: 'System',
          content: messageContent.trim(),
          type: 'system',
          media: null
        };
      } else {
        // Regular message format: date, time, sender, content
        const [, dateStr, timeStr, sender, messageContent] = match;
        const timestamp = parseDateTime(dateStr, timeStr, formatType);
        const analysis = analyzeMessage(messageContent);

        currentMessage = {
          id: `msg_${++messageId}`,
          timestamp,
          sender: sender.trim(),
          content: messageContent.trim(),
          ...analysis
        };
      }
    } else if (currentMessage) {
      // Multi-line message continuation
      currentMessage.content += '\n' + line;
    }
  }

  // Add last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

/**
 * Extract chat metadata from messages
 */
export function extractMetadata(messages, chatName) {
  const participants = new Set();
  let earliestDate = null;
  let latestDate = null;

  messages.forEach(msg => {
    if (msg.type !== 'system') {
      participants.add(msg.sender);
    }

    const msgDate = new Date(msg.timestamp);
    if (!earliestDate || msgDate < earliestDate) {
      earliestDate = msgDate;
    }
    if (!latestDate || msgDate > latestDate) {
      latestDate = msgDate;
    }
  });

  return {
    chatName,
    exportDate: new Date().toISOString().split('T')[0],
    messageCount: messages.length,
    participants: Array.from(participants),
    dateRange: {
      start: earliestDate ? earliestDate.toISOString().split('T')[0] : null,
      end: latestDate ? latestDate.toISOString().split('T')[0] : null
    }
  };
}
