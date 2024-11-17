# Mini Note MD

[English](README.md) | [中文](README.zh-CN.md)

A minimalist Markdown note-taking app with real-time preview, version history, and dark mode support.

## Key Features

### 📝 Editor
- Real-time preview
- Split/Edit/Preview modes
- Customizable font size & line height
- Smart Tab indentation
- Auto-indent for lists
- Keyboard shortcuts
- Auto-save (every 5 minutes)
- Manual save (Ctrl/Cmd + S)

### 🎨 Markdown Support
- Support Markdown syntax
- Code syntax highlighting
- Default code language setting
- One-click code copying
- Multiple programming languages
- Table support
- Image support
- Math formula support

### 📅 Note Management
- Date-based organization
- Note listing & search
- Note preview/edit/delete
- Quick navigation to previous/next day

### ⏱️ Version History
- Automatic version saving
- View/Preview versions
- Version restore
- Delete single version
- Clear all versions
- Auto-cleanup (30-day retention)

### 🎯 UI & Themes
- Auto dark/light theme
- Responsive design
- Mobile-friendly
- Adjustable split view
- Custom font sizes
- Custom line heights

### 🔐 Security
- Password protection
- JWT authentication
- HttpOnly Cookie
- 30-day token expiry
- Secure logout

## Quick Start

### Requirements
- Node.js 18.0+
- npm or Docker

### Local Setup
1. Clone and run
   ```bash
   git clone https://github.com/IM594/mininote-md.git
   cd mininote-md
   npm install
   npm start    # production mode
   npm run dev  # development mode (hot reload)
   ```

2. Visit `http://localhost:3456`, default password: `test0000`

### Docker Setup
1. Direct run
   ```bash
   docker run -d \
     -p 3456:3456 \
     -v /path/to/data:/app/data \
     -e PASSWORD=your-secure-password \
     -e SALT=your-secure-salt \
     -e NODE_ENV=production \
     im594/mininote-md:latest
   ```

2. Using docker-compose
   ```yaml
   version: '3'
   services:
     note-app:
       image: im594/mininote-md:latest
       ports:
         - "3456:3456"
       volumes:
         - ./data:/app/data
       environment:
         - PASSWORD=your-secure-password
         - SALT=your-secure-salt
         - NODE_ENV=production
       restart: unless-stopped
   ```
   
   Run: `docker-compose up -d`

### Environment Variables
- `PORT`: Server port (default: 3456)
- `PASSWORD`: Login password (default: test0000)
- `SALT`: JWT secret salt
- `NODE_ENV`: production/development

## Usage

### Shortcuts
- `Ctrl/Cmd + S`: Manual save
- `Tab`: Increase indent
- `Shift + Tab`: Decrease indent
- List auto-indent: Tab in list items to increase level
- Empty list item: Enter to remove list marker

### Note Management
- Click top-right menu for features
- View note list and history
- Search notes by title
- Preview, edit or delete notes

### Editor Settings
- Adjust editor/preview font size
- Adjust editor/preview line height
- Set default code language
- Adjust split view ratio (drag divider)

### Data Storage
- Notes: `data/notes` directory
- History: `data/history` directory
- Settings: `data/settings` directory

## Roadmap

- [x] Docker support
- [x] Dark mode
- [x] Version history
- [x] Note search
- [ ] Internationalization
- [ ] Note export

## Tech Stack

- Frontend: Vanilla JavaScript + Marked.js + Highlight.js
- Backend: Node.js + Express + JWT
- Storage: File system
- Container: Docker

## Contributing

Issues and Pull Requests are welcome.

## License

MIT License