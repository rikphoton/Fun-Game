// NeonPulse Arcade - Gamepad Controller & Haptic Rumble Engine
import { sound } from './audio.js';

class GamepadController {
  constructor() {
    this.gamepadIndex = null;
    this.isConnected = false;
    this.name = 'Controller';
    this.deadzone = 0.22;

    // Button states (current and previous for edge detection)
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false, // A
      super: false,  // B / X
      nitro: false,  // RT / Y
      pause: false,  // Start
      axisX: 0,
      axisY: 0
    };

    this.prevState = { ...this.state };
    this.onStatusChange = null;

    this.init();
  }

  init() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      this.isConnected = true;
      this.name = e.gamepad.id.split('(')[0].trim() || 'Wireless Controller';
      console.log(`[Gamepad] Connected: ${this.name} at index ${this.gamepadIndex}`);

      sound.play('powerup');
      sound.announce('Gamepad Connected');
      this.rumble(250, 0.4, 0.6);

      if (this.onStatusChange) {
        this.onStatusChange(true, this.name);
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.handleDisconnect(e && e.gamepad ? e.gamepad.index : undefined);
    });
  }

  handleDisconnect(index) {
    if (this.gamepadIndex === index || index === undefined) {
      console.log(`[Gamepad] Disconnected: ${this.name}`);
      this.isConnected = false;
      this.gamepadIndex = null;
      this.state = {
        up: false,
        down: false,
        left: false,
        right: false,
        action: false,
        super: false,
        nitro: false,
        pause: false,
        axisX: 0,
        axisY: 0
      };
      this.prevState = { ...this.state };
      sound.play('hit');

      if (this.onStatusChange) {
        this.onStatusChange(false, this.name);
      }
    }
  }

  setDeadzone(val) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      this.deadzone = Math.max(0.05, Math.min(0.6, val));
    }
  }

  poll() {
    const gamepads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];

    // If no controller was assigned, opportunistically check if any connected controller exists
    if (this.gamepadIndex === null) {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected !== false) {
          this.gamepadIndex = i;
          this.isConnected = true;
          this.name = (gamepads[i].id && gamepads[i].id.split('(')[0].trim()) || 'Wireless Controller';
          if (this.onStatusChange) this.onStatusChange(true, this.name);
          break;
        }
      }
      if (this.gamepadIndex === null) return this.state;
    }

    const gp = gamepads[this.gamepadIndex];

    // Handle stale state / missed disconnection event
    if (!gp || gp.connected === false) {
      this.handleDisconnect(this.gamepadIndex);
      return this.state;
    }

    this.prevState = { ...this.state };

    const buttons = gp.buttons;
    const axes = gp.axes;

    // Analog Left Stick with Deadzone
    let ax = axes[0] || 0;
    let ay = axes[1] || 0;
    if (Math.abs(ax) < this.deadzone) ax = 0;
    if (Math.abs(ay) < this.deadzone) ay = 0;

    const isStandard = gp.mapping === 'standard';
    const pressed = (i) => (buttons[i] ? buttons[i].pressed : false);

    // D-Pad
    let dUp, dDown, dLeft, dRight;
    if (isStandard) {
      dUp = pressed(12);
      dDown = pressed(13);
      dLeft = pressed(14);
      dRight = pressed(15);
    } else {
      // Non-standard pads (PlayStation / Switch / generic HID in Firefox & Safari) report the
      // D-pad as a hat axis (axes[9]) or as a pair of axes (6 & 7) instead of buttons 12-15.
      const hat = axes.length > 9 ? axes[9] : null;
      let hUp = false, hDown = false, hLeft = false, hRight = false;
      if (hat !== null && hat >= -1.01 && hat <= 1.01) {
        // Hat axis encodes 8 directions in steps of 2/7, starting at "up" = -1
        const step = Math.round((hat + 1) / (2 / 7));
        hUp = step === 0 || step === 1 || step === 7;
        hRight = step >= 1 && step <= 3;
        hDown = step >= 3 && step <= 5;
        hLeft = step >= 5 && step <= 7;
      }
      const dx = axes.length > 7 ? axes[6] || 0 : 0;
      const dy = axes.length > 7 ? axes[7] || 0 : 0;
      dUp = pressed(12) || hUp || dy < -0.5;
      dDown = pressed(13) || hDown || dy > 0.5;
      dLeft = pressed(14) || hLeft || dx < -0.5;
      dRight = pressed(15) || hRight || dx > 0.5;
    }

    // Face buttons: indices 0-3 (A/B/X/Y or Cross/Circle/Square/Triangle) are the same on
    // virtually every pad. Shoulder/Start positions differ, so fall back to common layouts.
    const btnA = pressed(0);
    const btnB = pressed(1);
    const btnX = pressed(2);
    const btnY = pressed(3);
    const btnRT = isStandard ? pressed(7) : (pressed(7) || pressed(5));
    const btnStart = isStandard ? pressed(9) : (pressed(9) || pressed(8) || pressed(11));

    this.state = {
      up: dUp || ay < -0.4,
      down: dDown || ay > 0.4,
      left: dLeft || ax < -0.4,
      right: dRight || ax > 0.4,
      action: btnA,
      super: btnB || btnX,
      nitro: btnY || btnRT,
      pause: btnStart,
      axisX: ax,
      axisY: ay
    };

    return this.state;
  }

  isJustPressed(btnKey) {
    return this.state[btnKey] && !this.prevState[btnKey];
  }

  rumble(durationMs = 200, weakMagnitude = 0.5, strongMagnitude = 0.5) {
    if (this.gamepadIndex === null) return;
    const gamepads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];

    if (gp && gp.vibrationActuator) {
      try {
        // Only Chromium implements vibrationActuator.playEffect; guard against missing method/promise.
        if (typeof gp.vibrationActuator.playEffect !== 'function') return;
        const result = gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1.0, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1.0, Math.max(0, strongMagnitude))
        });
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (e) {
        // Vibration actuator unsupported on this specific model
      }
    }
  }
}

export const gamepad = new GamepadController();
