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
      if (this.gamepadIndex === e.gamepad.index) {
        console.log(`[Gamepad] Disconnected: ${this.name}`);
        this.isConnected = false;
        this.gamepadIndex = null;
        sound.play('hit');

        if (this.onStatusChange) {
          this.onStatusChange(false, this.name);
        }
      }
    });
  }

  poll() {
    if (this.gamepadIndex === null) return this.state;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];

    if (!gp) return this.state;

    this.prevState = { ...this.state };

    const buttons = gp.buttons;
    const axes = gp.axes;

    // Analog Left Stick with Deadzone
    let ax = axes[0] || 0;
    let ay = axes[1] || 0;
    if (Math.abs(ax) < this.deadzone) ax = 0;
    if (Math.abs(ay) < this.deadzone) ay = 0;

    // D-Pad
    const dUp = buttons[12] ? buttons[12].pressed : false;
    const dDown = buttons[13] ? buttons[13].pressed : false;
    const dLeft = buttons[14] ? buttons[14].pressed : false;
    const dRight = buttons[15] ? buttons[15].pressed : false;

    // Standard Buttons (Xbox: A=0, B=1, X=2, Y=3, RT=7, Start=9)
    const btnA = buttons[0] ? buttons[0].pressed : false;
    const btnB = buttons[1] ? buttons[1].pressed : false;
    const btnX = buttons[2] ? buttons[2].pressed : false;
    const btnY = buttons[3] ? buttons[3].pressed : false;
    const btnRT = buttons[7] ? buttons[7].pressed : false;
    const btnStart = buttons[9] ? buttons[9].pressed : false;

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
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];

    if (gp && gp.vibrationActuator) {
      try {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1.0, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1.0, Math.max(0, strongMagnitude))
        }).catch(() => {});
      } catch (e) {
        // Vibration actuator unsupported on this specific model
      }
    }
  }
}

export const gamepad = new GamepadController();
