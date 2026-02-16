import { readdir, copyFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';

/**
 * Get all media files from the chat export directory
 */
export async function getMediaFiles(chatDir) {
  const files = await readdir(chatDir);

  // Filter out the _chat.txt file and only keep media files
  const mediaFiles = files.filter(file => {
    if (file === '_chat.txt' || file.startsWith('.')) {
      return false;
    }

    const ext = extname(file).toLowerCase();
    const mediaExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',  // images
      '.mp4', '.avi', '.mov', '.mkv',            // videos
      '.opus', '.mp3', '.ogg', '.aac', '.m4a',   // audio
      '.pdf', '.doc', '.docx', '.xls', '.xlsx'   // documents
    ];

    return mediaExtensions.includes(ext);
  });

  return mediaFiles;
}

/**
 * Copy media files to output directory
 */
export async function copyMediaFiles(chatDir, outputDir, mediaFiles) {
  const mediaOutputDir = join(outputDir, 'media');

  // Create media directory
  await mkdir(mediaOutputDir, { recursive: true });

  // Copy each file
  for (const file of mediaFiles) {
    const sourcePath = join(chatDir, file);
    const destPath = join(mediaOutputDir, file);
    await copyFile(sourcePath, destPath);
  }

  console.log(`Copied ${mediaFiles.length} media files to ${mediaOutputDir}`);
}

/**
 * Validate that all media references in messages exist
 */
export function validateMediaReferences(messages, mediaFiles) {
  const mediaSet = new Set(mediaFiles);
  const missingMedia = [];

  messages.forEach(msg => {
    if (msg.media && msg.media.filename) {
      if (!mediaSet.has(msg.media.filename)) {
        missingMedia.push({
          messageId: msg.id,
          filename: msg.media.filename
        });
      }
    }
  });

  if (missingMedia.length > 0) {
    console.warn(`Warning: ${missingMedia.length} media references not found`);
    missingMedia.slice(0, 5).forEach(item => {
      console.warn(`  - ${item.filename} (in ${item.messageId})`);
    });
  }

  return missingMedia;
}
