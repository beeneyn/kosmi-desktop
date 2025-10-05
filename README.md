## Kosmi Desktop

A feature-rich, community-driven desktop client for Kosmi.io, built with Electron. This application provides a seamless, native experience for joining rooms, watching videos, playing games, and interacting with friends, complete with OS integrations and quality-of-life improvements.

### ✨ Features

This client enhances the standard Kosmi web experience with powerful features:

* **Native Feel:** Runs in its own window with a dedicated icon and tray support.
* **Auto Updates:** Automatically checks for and installs new versions on startup.
* **OS Notifications:** Get native desktop notifications for messages and alerts from Kosmi.
* **Discord Rich Presence:** Show your current Kosmi activity on your Discord profile.
* **Media Key Support:** Use your keyboard's Play/Pause keys to control media.
* **Advanced Controls:** Full menu bar with navigation (Back/Forward), reload, full screen, mute, and zoom controls.
* **Always on Top:** Pin the window to stay on top of other applications.
* **Recent Rooms:** A dedicated menu to quickly rejoin your last 10 rooms.
* **Custom CSS:** Power-user feature to apply your own custom styles to Kosmi.
* **Single Instance Lock:** Prevents multiple copies of the app from running.
* **Persistent Settings:** Remembers your window size, position, mute, and always-on-top preferences.

### 📥 Download & Installation

You can download the latest version for your operating system from the [**GitHub Releases page**](https://github.com/beeneyn/kosmi-desktop/releases/latest).

#### Windows

1.  Download the `Kosmi-Desktop-Setup-x.x.x.exe` file.
2.  Run the installer. Windows SmartScreen might show a warning because the app is not signed.
3.  If you see the warning, click **"More info"** -> **"Run anyway"**.

#### macOS

1.  Download the `Kosmi-Desktop-x.x.x.dmg` file.
2.  Open the `.dmg` file and drag the **Kosmi Desktop** icon into your **Applications** folder.
3.  **Important:** Please follow the steps below to run the app for the first time.

##### macOS Installation Note (Gatekeeper Warning)

Since this is an unsigned application from an independent developer, macOS Gatekeeper will show a security warning. You only need to do this the first time you run the app.

1.  After moving the app to your Applications folder, **do not** double-click it.
2.  Instead, **right-click** (or `Ctrl`-click) the **Kosmi Desktop** icon.
3.  Select **"Open"** from the context menu.
4.  A warning dialog will appear, but this time it will have an **"Open"** button. Click it.

The app will now be saved as an exception in your security settings, and you can launch it normally from now on.

#### Linux

1.  Download the `Kosmi-Desktop-x.x.x.AppImage` file.
2.  Make the file executable:
    ```bash
    chmod +x Kosmi-Desktop-x.x.x.AppImage
    ```
3.  Run the application:
    ```bash
    ./Kosmi-Desktop-x.x.x.AppImage
    ```

### 💻 For Developers

If you want to contribute or run the application from the source code:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/beeneyn/kosmi-desktop.git](https://github.com/beeneyn/kosmi-desktop.git)
    cd kosmi-desktop
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the application in development mode:**
    ```bash
    npm start
    ```
4.  **Build the application for distribution:**
    ```bash
    npm run dist
    ```
