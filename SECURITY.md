# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.0-rc1` | :white_check_mark: |
| `< 1.0.0` | :x: |

---

## 🛡️ Architecture & Security Model

NeonPulse Arcade is designed to operate securely across web browsers, Progressive Web Apps (PWAs), and Electron desktop runtimes:

1. **Content Security & Protocol Compatibility**:
   - The production build is compiled as a classic deferred script without cross-origin module loader requirements, allowing it to execute safely in sandboxed environments and local `file://` protocols.
2. **Desktop Runtime Isolation (Electron)**:
   - `nodeIntegration: false`: Renderer processes are completely isolated from Node.js runtime APIs.
   - `contextIsolation: true`: Preload scripts execute in distinct execution contexts.
   - `sandbox: true`: Standard OS-level browser sandbox is enabled.
   - `webSecurity: true`: Same-origin policy is strictly enforced.
   - **Navigation Restrictions**: All external hyperlinks are intercepted and passed to the host OS default browser via `shell.openExternal()`; renderer windows are prevented from navigating to arbitrary URLs.
3. **Local Storage Sanitization**:
   - Save data loaded from `localStorage` is passed through strict migration sanitizers (`sanitizeSaveData()` in `src/engine/storage.js`) with schema versioning and corruption recovery.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:
- **Email**: Send vulnerability reports to the project maintainers via GitHub Security Advisories or maintainer email.
- **Response Target**: Reports will be acknowledged within 48 hours with remediation patches prioritized for subsequent release candidates.
