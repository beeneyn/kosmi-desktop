# Kosmi Desktop

Kosmi Desktop is an Electron-based application that brings the full Kosmi experience to your desktop. Join chatrooms, watch videos, play games, and listen to music with friends in a seamless and user-friendly interface.

## Features

- Desktop application for Kosmi.io
- Auto-updater support
- Discord Rich Presence integration
- Cross-platform support (Windows, macOS, Linux)

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

### Building the App

To build the application for your current platform:

```bash
npm run dist
```

The built application will be in the `dist/` directory.

## Releases

### Automated Builds

This repository includes a GitHub Actions workflow that automatically builds and publishes the Electron app to GitHub releases.

#### How to Create a Release

1. Create a new tag (e.g., `v1.2.1`):
   ```bash
   git tag v1.2.1
   git push origin v1.2.1
   ```

2. Create a new release on GitHub:
   - Go to the repository's "Releases" page
   - Click "Create a new release"
   - Select the tag you just created
   - Add release notes
   - Click "Publish release"

3. The GitHub Actions workflow will automatically:
   - Build the app for Windows (NSIS installer)
   - Build the app for macOS (DMG)
   - Build the app for Linux (AppImage)
   - Upload all build artifacts to the release

#### Build Artifacts

The workflow produces the following artifacts:
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` executable

### Manual Publishing

If you need to manually publish to a release:

```bash
npm run dist -- --publish always
```

Make sure you have the `GH_TOKEN` environment variable set with a GitHub personal access token that has repo access.

## Configuration

The app uses `electron-store` for persistent settings. Configuration files are stored in:
- **Windows**: `%APPDATA%\Kosmi Desktop\`
- **macOS**: `~/Library/Application Support/Kosmi Desktop/`
- **Linux**: `~/.config/Kosmi Desktop/`

## Discord Rich Presence

The app includes Discord Rich Presence integration. When you're using Kosmi Desktop, your Discord status will show that you're using Kosmi.

## Auto-Updates

The app uses `electron-updater` to automatically check for and install updates. Users will be notified when a new version is available.

## License

MIT

## Author

Kosmi Inc
