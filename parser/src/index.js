#!/usr/bin/env node

import { readdir, writeFile, mkdir } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { parseChatFile, extractMetadata } from './parser.js';
import { getMediaFiles, copyMediaFiles, validateMediaReferences } from './mediaHandler.js';
import { generateHtmlFile } from './htmlGenerator.js';

/**
 * Find all WhatsApp chat export directories
 */
async function findChatDirectories(baseDir) {
  const entries = await readdir(baseDir, { withFileTypes: true });

  const chatDirs = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('WhatsApp Chat')) {
      chatDirs.push(join(baseDir, entry.name));
    }
  }

  return chatDirs;
}

/**
 * Process a single chat directory
 */
async function processChat(chatDir, outputBaseDir) {
  console.log(`\nProcessing: ${basename(chatDir)}`);
  console.log('='.repeat(60));

  const chatName = basename(chatDir).replace('WhatsApp Chat - ', '');
  const chatFile = join(chatDir, '_chat.txt');

  // Create output directory for this chat
  const outputDir = join(outputBaseDir, chatName.replace(/[^a-z0-9]/gi, '_'));
  await mkdir(outputDir, { recursive: true });

  try {
    // Parse chat messages
    console.log('Parsing messages...');
    const messages = await parseChatFile(chatFile);
    console.log(`✓ Parsed ${messages.length} messages`);

    // Extract metadata
    const metadata = extractMetadata(messages, chatName);
    console.log(`✓ Found ${metadata.participants.length} participants`);
    console.log(`✓ Date range: ${metadata.dateRange.start} to ${metadata.dateRange.end}`);

    // Get media files
    console.log('Processing media files...');
    const mediaFiles = await getMediaFiles(chatDir);
    console.log(`✓ Found ${mediaFiles.length} media files`);

    // Validate media references
    validateMediaReferences(messages, mediaFiles);

    // Copy media files
    await copyMediaFiles(chatDir, outputDir, mediaFiles);

    // Write JSON files (for backup/reference)
    console.log('Writing output files...');
    await writeFile(
      join(outputDir, 'chat-metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    console.log('✓ Wrote chat-metadata.json');

    await writeFile(
      join(outputDir, 'messages.json'),
      JSON.stringify(messages, null, 2),
      'utf-8'
    );
    console.log('✓ Wrote messages.json');

    // Generate HTML file
    console.log('Generating HTML...');
    const htmlPath = await generateHtmlFile(messages, metadata, outputDir);
    console.log(`✓ Generated ${basename(htmlPath)}`);

    console.log(`\n✓ Successfully processed "${chatName}"`);
    console.log(`  Output: ${outputDir}`);
    console.log(`  Open: ${htmlPath}`);

    return {
      success: true,
      chatName,
      outputDir,
      stats: {
        messages: messages.length,
        media: mediaFiles.length
      }
    };

  } catch (error) {
    console.error(`✗ Error processing ${chatName}:`, error.message);
    return {
      success: false,
      chatName,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('WhatsApp Chat Parser');
  console.log('='.repeat(60));

  // Get base directory (parent of parser directory)
  const baseDir = resolve(process.cwd(), '..');
  const outputBaseDir = join(process.cwd(), 'output');

  console.log(`Base directory: ${baseDir}`);
  console.log(`Output directory: ${outputBaseDir}\n`);

  // Create output directory
  await mkdir(outputBaseDir, { recursive: true });

  // Find chat directories
  const chatDirs = await findChatDirectories(baseDir);

  if (chatDirs.length === 0) {
    console.log('No WhatsApp chat exports found!');
    console.log('Expected format: "WhatsApp Chat - [GroupName]" directory');
    console.log('with a _chat.txt file inside.');
    return;
  }

  console.log(`Found ${chatDirs.length} chat(s) to process:\n`);
  chatDirs.forEach((dir, i) => {
    console.log(`${i + 1}. ${basename(dir)}`);
  });

  // Process each chat
  const results = [];
  for (const chatDir of chatDirs) {
    const result = await processChat(chatDir, outputBaseDir);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ Successfully processed: ${successful.length}/${results.length} chats`);

  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`  - ${r.chatName}: ${r.stats.messages} messages, ${r.stats.media} media files`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n✗ Failed: ${failed.length} chats`);
    failed.forEach(r => {
      console.log(`  - ${r.chatName}: ${r.error}`);
    });
  }

  console.log(`\nOutput saved to: ${outputBaseDir}`);
  console.log('\nTo view your chats:');
  console.log('  1. Open the chat.html file in any browser');
  console.log('  2. Or copy the folder to your phone and open chat.html there');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
