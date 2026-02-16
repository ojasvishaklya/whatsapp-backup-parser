import { readFile } from 'fs/promises';

/**
 * Parse WhatsApp chat text file
 * Format: [DD/MM/YY, HH:MM:SS AM/PM] Sender: Message
 */

// Regex to match message start line
const MESSAGE_START_PATTERN = /^\[(\d{2}\/\d{2}\/\d{2}), (\d{1,2}:\d{2}:\d{2} [AP]M)\] ([^:]+): (.*)$/;

// Regex to match media attachments
const MEDIA_ATTACHED_PATTERN = /<attached: (.+?)>/;
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
 * Input: "18/06/25", "11:52:46 AM"
 * Output: "2025-06-18T11:52:46"
 */
function parseDateTime(dateStr, timeStr) {
  const [day, month, year] = dateStr.split('/');
  const fullYear = `20${year}`; // Assuming 2000s

  // Parse time
  let [time, period] = timeStr.split(' ');
  let [hours, minutes, seconds] = time.split(':').map(Number);

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
  // Check for attached media
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

    const match = line.match(MESSAGE_START_PATTERN);

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      // Start new message
      const [, dateStr, timeStr, sender, messageContent] = match;
      const timestamp = parseDateTime(dateStr, timeStr);
      const analysis = analyzeMessage(messageContent);

      currentMessage = {
        id: `msg_${++messageId}`,
        timestamp,
        sender: sender.trim(),
        content: messageContent.trim(),
        ...analysis
      };
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
