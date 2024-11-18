# Mini Note MD

[English](README.md) | [中文](README.zh-CN.md)

A minimalist Markdown note-taking app with real-time preview, real-time collaboration, version history, and dark mode support.

## Key Features

### 📝 Editor
- Real-time preview
- Split/Edit/Preview modes
- Customizable font size & line height
- Smart Tab indentation
- Auto-indent for lists
- Keyboard shortcuts (Ctrl/Cmd + S)
- Auto-save (every 5 minutes)

### 🤝 Real-time Collaboration
- Multi-device synchronization
- Real-time content updates
- Cursor position preservation
- WebSocket-based communication

### 🎨 Markdown Support
- Basic Markdown syntax
- Code syntax highlighting
- Default code language setting
- One-click code copying
- Table support

### 📅 Note Management
- Date-based organization
- Note listing & search
- Note preview/edit/delete

### ⏱️ Version History
- Automatic version saving
- View/Preview versions
- Version restore
- Delete single version
- Clear all versions
- Auto-cleanup (30-day retention)

### 🎯 UI & Themes
- Auto dark/light theme
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

### 1Panel Setup
1. Click "Container" -> "Images" -> "Image Management" in the left menu
2. Pull image: `im594/mininote-md:latest`
3. Go to "Container" -> "Create Container"
4. Configure the container:
   - Name: `mininote-md`
   - Image: `im594/mininote-md:latest`
   - Port -> Expose Port -> Add: `3456` `3456`
   - Fill in network and ipv4 address
   - Mount -> Add
       - Local directory: `/data/mininote-md`
       - Permission: `Read & Write`
       - Container directory: `/app/data`
   - Restart policy: Any
   - CPU weight: 1024 (default)
   - CPU limit: Any
   - Memory limit: Any
   - Environment variables:
     ```
     PASSWORD=<your-login-password>
     SALT=<your-secure-salt>
     NODE_ENV=production
     ```
5. Click "Confirm"

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

- Frontend: Vanilla JavaScript + Marked.js + Highlight.js + WebSocket
- Backend: Node.js + Express + JWT + ws
- Storage: File system
- Container: Docker
- Proxy: OpenResty/Nginx

## Contributing

Issues and Pull Requests are welcome.

## License

MIT License

## Deployment

### Nginx/OpenResty Configuration
For HTTPS and WebSocket support, add the following configuration:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.3 TLSv1.2 TLSv1.1 TLSv1;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HTTP to HTTPS redirect
    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000";
    
    # Proxy Configuration
    location / {
        proxy_pass http://127.0.0.1:3456;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # SSL related
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-SSL-Protocol $ssl_protocol;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_connect_timeout 300s;
        
        # WebSocket specific
        proxy_buffering off;
        proxy_cache off;
        
        # Error handling
        proxy_intercept_errors on;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
    
    # Logs
    access_log /path/to/access.log;
    error_log /path/to/error.log;
}
```

Remember to:
1. Replace `your-domain.com` with your actual domain
2. Update SSL certificate paths
3. Adjust log file paths
4. Restart Nginx/OpenResty after configuration changes

## Latest Updates

- Added real-time collaboration support
- Added WebSocket secure connection
- Added connection status indicator
- Added automatic conflict resolution
- Improved multi-device synchronization
