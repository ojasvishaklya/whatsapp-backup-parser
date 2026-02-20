# WhatsApp Chat Parser & HTML Viewer

Parse WhatsApp chat exports and generate a standalone HTML viewer that works offline on any device.

## Features

- ✅ **WhatsApp-like UI** - Green theme, message bubbles, date dividers
- ✅ **Custom Search** - Highlight all matches, navigate with arrows
- ✅ **Jump to Date** - Quick date picker to navigate to any date
- ✅ **Font Controls** - Increase/decrease text size (A- / A+)
- ✅ **Clickable Links** - YouTube, Instagram, all URLs auto-detected
- ✅ **Media Support** - Images, audio, video, documents
- ✅ **Keyboard Shortcuts** - Ctrl+F search, Ctrl+G date picker, Ctrl+Plus/Minus font size
- ✅ **Mobile-Friendly** - Responsive design, works on any screen
- ✅ **Completely Offline** - No internet needed after initial load
- ✅ **Zero Dependencies** - Pure Node.js, no npm packages
- ✅ **Privacy-First** - All data stays on your device

**[See detailed features →](FEATURES.md)**

## Quick Start

### 1. Parse Your Chat Export

```bash
# Place WhatsApp export folder in project root
# Format: "WhatsApp Chat - [Name]/"

cd parser
npm run parse
```

**Input:** Exported WhatsApp folder with:
- `_chat.txt` (chat messages)
- Media files (images, audio, etc.)

**Output:** `parser/output/[ChatName]/`
- `chat.html` ← **Open this file!**
- `media/` (all media files)
- JSON backups

### 2. View Your Chat

**Desktop:**
- Double-click `chat.html`
- Opens in browser

**Mobile:**
- Copy entire folder to phone
- Tap `chat.html` in file manager
- Opens in Chrome/browser

### 3. Add Multiple Chats

```bash
# Add more exports to root folder
whatsapp-chat-parser/
├── WhatsApp Chat - Family/
├── WhatsApp Chat - Friends/
└── WhatsApp Chat - Work/

# Parse all at once
cd parser && npm run parse

# Each gets its own HTML
parser/output/
├── Family/chat.html
├── Friends/chat.html
└── Work/chat.html
```

## HTML Features

- **Search** - Type to highlight all matches (🔍 button or Ctrl+F)
- **Jump to Date** - Quick date picker to navigate to any date (📅 button or Ctrl+G)
- **Font Size** - A- and A+ buttons adjust text size
- **Scroll to Bottom** - ⬇ Latest button jumps to newest messages
- **Click Images** - Opens full size in new tab
- **Audio/Video** - Built-in HTML5 players
- **Links** - All URLs are clickable, open in new tab
- **Date Dividers** - "Today", "Yesterday", or full dates
- **Reverse Scrolling** - Automatically scrolls to latest messages

## What Gets Parsed

**Messages:**
- Regular text, multi-line messages
- Emojis, Unicode, Hindi/other languages
- System messages (joined, left, etc.)

**Media:**
- Images: JPG, PNG, WEBP, GIF
- Audio: OPUS, MP3, M4A, OGG
- Video: MP4, AVI, MOV
- Documents: PDF, DOC, XLS

**Links:**
- HTTP/HTTPS URLs
- YouTube, Instagram, Facebook
- Auto-detected and clickable

## Project Structure

```
whatsapp-chat-parser/
├── README.md              # This file
├── FEATURES.md            # Detailed features
├── LICENSE               # MIT license
└── parser/
    ├── package.json
    ├── src/
    │   ├── index.js         # Main entry
    │   ├── parser.js        # Text parsing
    │   ├── mediaHandler.js  # Media handling
    │   └── htmlGenerator.js # HTML generation
    └── output/
        └── [ChatName]/
            ├── chat.html       # Open this!
            └── media/          # All media files
```

## Requirements

- **Node.js 18+**
- **No dependencies** (pure Node.js)
- **Any browser** (Chrome, Firefox, Safari)

## Usage Examples

### Parse Single Chat

```bash
# 1. Get WhatsApp export from friend
# 2. Extract: "WhatsApp Chat - Group Name"
# 3. Move to project root
# 4. Run parser
cd parser && npm run parse

# 5. Open output
open output/Group_Name/chat.html
```

### Copy to Phone

```bash
# Copy entire folder to phone via:
# - USB cable (fastest)
# - Google Drive / Dropbox
# - Local network transfer

# On phone:
# 1. Open file manager (Google Files)
# 2. Navigate to copied folder
# 3. Tap chat.html
# 4. Opens in browser!
# 5. Add to home screen for quick access
```

### Update Existing Chat

```bash
# Get updated export from friend
# Replace old folder in project root
cd parser && npm run parse
# New HTML overwrites old one
# Copy updated folder to phone
```

## Keyboard Shortcuts

- **Ctrl/Cmd + F** - Open search
- **Ctrl/Cmd + G** - Open date picker
- **Ctrl/Cmd + Plus** - Increase font size
- **Ctrl/Cmd + Minus** - Decrease font size
- **Enter** - Next search result / Jump to selected date
- **Shift + Enter** - Previous search result
- **Escape** - Close search / Close date picker
- **End** - Scroll to bottom

## Tips

### Best Practices
1. **Keep folder structure** - Don't separate `chat.html` from `media/`
2. **Use Chrome/Firefox** - Best HTML5 support
3. **Copy entire folder** - Always transfer the whole folder
4. **Regular backups** - Keep copies of output folder

### On Mobile
1. **Install Chrome** - Best browser for HTML files
2. **Use Google Files** - Good file manager with HTML support
3. **Add to Home Screen** - Bookmark for easy access
4. **Landscape mode** - More space for messages

### Storage Management
- **Text only:** Skip media files (images won't load)
- **Delete old chats:** Remove folders you don't need
- **Compress before transfer:** `zip -r Chat.zip Chat/`

## Troubleshooting

**Parser:**
- ❌ "No exports found" → Folder must start with "WhatsApp Chat - "
- ❌ "Media not found" → Check files are in same folder as `_chat.txt`

**HTML:**
- ❌ "Images not showing" → Keep `media/` folder with `chat.html`
- ❌ "Can't open on phone" → Try Chrome or Firefox browser
- ❌ "Search not working" → Refresh page with Ctrl+Shift+R

## Performance

- **Parse time:** ~15 seconds (11K messages, 3K media files)
- **HTML size:** ~5 MB for 11,000 messages
- **Load time:** Instant (<1 second)
- **Scrolling:** Smooth 60fps with 10,000+ messages

## Privacy & Security

- ✅ All data stays local
- ✅ No cloud uploads
- ✅ No tracking or analytics
- ✅ No external dependencies
- ✅ Works completely offline
- ✅ Your chats never leave your device

## License

MIT License - See [LICENSE](LICENSE) file

## Contributing

Issues and feature requests welcome on GitHub!

## Roadmap

- [ ] Dark mode toggle
- [x] Jump to date picker
- [ ] Filter by sender
- [ ] Export to PDF
- [ ] Message statistics

---

**Built with ❤️ for viewing WhatsApp exports offline**

See [FEATURES.md](FEATURES.md) for complete feature list and usage details.
