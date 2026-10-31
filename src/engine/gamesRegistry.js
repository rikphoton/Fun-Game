// NeonPulse Arcade - Central Game Metadata Registry
export const CHALLENGE_MODES = {
  standard: {
    key: 'standard',
    name: 'Standard Arcade',
    desc: 'Classic rules, balanced difficulty, standard progression.',
    icon: '🎮'
  },
  timeAttack: {
    key: 'timeAttack',
    name: 'Time Attack (3m)',
    desc: '3-minute countdown! Multiplier ramps up every 30 seconds.',
    icon: '⏱️'
  },
  oneLife: {
    key: 'oneLife',
    name: 'One-Life Hardcore',
    desc: 'High stakes! 1 HP with zero starting shields. One touch equals death.',
    icon: '💀'
  },
  bossRush: {
    key: 'bossRush',
    name: 'Boss Rush',
    desc: 'Bypass early waves straight into elite boss encounters.',
    icon: '👾'
  }
};

export const GAMES_METADATA = {
  cyberSurvivors: {
    key: 'cyberSurvivors',
    title: 'Cyber Survivors',
    genre: 'Roguelite Arena Survival',
    tag: 'SURVIVAL',
    badge: 'ROGUELITE',
    controlMode: 'joystick',
    instructions: 'Move: Centered 360° Joystick / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Super EMP: <kbd>SPACE</kbd> | Auto-Fire',
    hintText: '🕹️ CENTER 360° JOYSTICK: MOVE | 💣 NOVA',
    primaryLabel: 'SUPER EMP',
    subLabel: 'BOOST',
    superLabel: 'NOVA',
    hud: { hp: true, super: true, superText: 'NOVA' }
  },
  neonDash: {
    key: 'neonDash',
    title: 'Neon Dash',
    genre: 'Infinite High-Speed Runner',
    tag: 'RUNNER',
    badge: 'RUNNER',
    controlMode: 'dpad',
    instructions: 'Flip Gravity: <kbd>SPACE</kbd> or Click | Air-Dash: Tap while airborne | Dodge Spikes',
    hintText: '🕹️ TAP 🅰️ TO FLIP GRAVITY',
    primaryLabel: 'JUMP / FLIP',
    subLabel: 'AIR DASH',
    superLabel: 'BURST',
    hud: { hp: false, super: false }
  },
  quantumBreaker: {
    key: 'quantumBreaker',
    title: 'Quantum Breaker',
    genre: 'Laser Paddle Block Demolition',
    tag: 'BRICK BREAKER',
    badge: 'ARCADE',
    controlMode: 'slider',
    instructions: 'Paddle: Centered Slider or Mouse / <kbd>A</kbd><kbd>D</kbd> | Fire Lasers: <kbd>SPACE</kbd>',
    hintText: '🕹️ CENTER SLIDER: PADDLE | 🅰️ FIRE',
    primaryLabel: 'LAUNCH / FIRE',
    subLabel: 'LASER',
    superLabel: 'BOMB',
    hud: { hp: false, super: false }
  },
  astroPulse: {
    key: 'astroPulse',
    title: 'Astro Pulse',
    genre: 'Retro Vertical Space Shoot-Em-Up',
    tag: 'SHMUP',
    badge: 'SPACE SHMUP',
    controlMode: 'joystick',
    instructions: 'Move: 360° Joystick / Mouse / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Smart Bomb: <kbd>SPACE</kbd> | Auto-Fire',
    hintText: '🕹️ CENTER 360° JOYSTICK: FLY | 💣 SMART BOMB',
    primaryLabel: 'FIRE',
    subLabel: 'THRUST',
    superLabel: 'SMART BOMB',
    hud: { hp: true, super: true, superText: 'BOMB' }
  },
  neonDrift: {
    key: 'neonDrift',
    title: 'Neon Drift',
    genre: 'Highway Cyberpunk Outrun Racer',
    tag: 'RACING',
    badge: 'DRIFT RACER',
    controlMode: 'dpad',
    instructions: 'Steer: <kbd>A</kbd><kbd>D</kbd> or Mouse | Nitro: <kbd>W</kbd> / <kbd>SPACE</kbd> | Drift: <kbd>S</kbd> / <kbd>SHIFT</kbd>',
    hintText: '🕹️ CENTER D-PAD | ⚡ DRIFT | 🅰️ NITRO',
    primaryLabel: 'NITRO',
    subLabel: 'DRIFT',
    superLabel: 'BOOST',
    hud: { hp: true, super: true, superText: 'NITRO' }
  },
  hexaTron: {
    key: 'hexaTron',
    title: 'Hexa-Tron',
    genre: 'Light-Cycle Cyber Arena Duel',
    tag: 'CYBER ARENA',
    badge: 'GRID DUEL',
    controlMode: 'dpad',
    instructions: 'Steer: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrows / Gamepad | Jump: <kbd>SPACE</kbd> | Nitro: <kbd>SHIFT</kbd> | EMP: <kbd>E</kbd>',
    hintText: '🕹️ CENTER D-PAD: TURN | 🅰️ PHASE JUMP',
    primaryLabel: 'PHASE JUMP',
    subLabel: 'NITRO',
    superLabel: 'EMP BLAST',
    hud: { hp: true, super: true, superText: 'SHIELD' }
  },
  cyberPacman: {
    key: 'cyberPacman',
    title: 'Cyber Pacman',
    genre: 'Cyberpunk Drone Grid Chomp',
    tag: 'MAZE CHOMP',
    badge: 'ARCADE MAZE',
    controlMode: 'toggle',
    instructions: 'Steer: Centered Joystick / D-Pad Buttons / Swipe / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | EMP: <kbd>SPACE</kbd>',
    hintText: '🕹️ CENTER JOYSTICK: STEER | 🅰️ EMP',
    primaryLabel: 'EMP STUN',
    subLabel: 'SPEED',
    superLabel: 'EMP BLAST',
    hud: { hp: true, super: true, superText: 'EMP' }
  }
};

export const VALID_GAME_KEYS = Object.freeze(Object.keys(GAMES_METADATA));

export function getGameMeta(key) {
  return GAMES_METADATA[key] || null;
}
