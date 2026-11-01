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
    portraitDims: { width: 720, height: 720 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Move: 360° Joystick / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Super EMP: <kbd>SPACE</kbd> | Auto-Fire',
    hintText: '🕹️ CENTER JOYSTICK: MOVE | ⚡ BOOST (LEFT) | 💣 NOVA (RIGHT)',
    primaryLabel: 'EMP',
    subLabel: 'BOOST',
    superLabel: 'NOVA',
    primaryIcon: '⚡',
    subIcon: '⚡',
    superIcon: '💣',
    showSub: true,
    showSuper: true,
    showPrimary: true,
    hud: { hp: true, super: true, superText: 'NOVA' },
    briefing: {
      objective: 'Survive unrelenting cyber drone swarms, collect data cores for tech perks, and detonate the Super Nova EMP.',
      keyboard: [
        'WASD or Arrow Keys to maneuver',
        'SPACE: Trigger Super Nova EMP blast',
        'SHIFT: Emergency Thruster Dash',
        'Plasma weapons auto-target nearest foes'
      ],
      mobile: [
        'Centred 360° Analog Joystick for fluid navigation',
        '⚡ BOOST (left): High-speed thruster surge',
        '💣 NOVA / ⚡ EMP (right): Screen-clearing detonations',
        'Weapons auto-fire continuously'
      ]
    }
  },
  neonDash: {
    key: 'neonDash',
    title: 'Neon Dash',
    genre: 'Infinite High-Speed Runner',
    tag: 'RUNNER',
    badge: 'RUNNER',
    controlMode: 'dpad',
    portraitDims: { width: 600, height: 800 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Flip Gravity: <kbd>SPACE</kbd> or Click | Air-Dash: Tap while airborne | Dodge Spikes',
    hintText: '🕹️ CENTER D-PAD / TAP SCREEN TO FLIP GRAVITY',
    primaryLabel: 'FLIP',
    subLabel: 'AIR DASH',
    superLabel: '',
    primaryIcon: '⬆️',
    subIcon: '⚡',
    superIcon: '🚀',
    showSub: true,
    showSuper: false,
    showPrimary: true,
    hud: { hp: false, super: false },
    briefing: {
      objective: 'Sprint through high-speed hazard corridors, flip gravity between floor and ceiling, and rocket dash over spikes.',
      keyboard: [
        'SPACE / Up Arrow / Click: Flip Gravity',
        'Tap SPACE while airborne: Rocket Air-Dash',
        'Collect gold stars to ramp score multiplier up to 5x'
      ],
      mobile: [
        'Centred directional control or tap canvas to Flip Gravity',
        '⚡ AIR DASH (left): Aerial rocket thrust over hazards',
        '⬆️ FLIP (right): Instant ceiling/floor gravity inversion'
      ]
    }
  },
  quantumBreaker: {
    key: 'quantumBreaker',
    title: 'Quantum Breaker',
    genre: 'Laser Paddle Block Demolition',
    tag: 'BRICK BREAKER',
    badge: 'ARCADE',
    controlMode: 'slider',
    portraitDims: { width: 760, height: 800 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Paddle: Touch Screen or Slider / <kbd>A</kbd><kbd>D</kbd> | Fire Lasers: <kbd>SPACE</kbd>',
    hintText: '🕹️ CENTER SLIDER / DRAG CANVAS | ⚡ LASER | 💣 BOMB',
    primaryLabel: 'LAUNCH',
    subLabel: 'LASER',
    superLabel: 'BOMB',
    primaryIcon: '🚀',
    subIcon: '⚡',
    superIcon: '💣',
    showSub: true,
    showSuper: true,
    showPrimary: true,
    hud: { hp: false, super: false },
    briefing: {
      objective: 'Demolish quantum defense matrices, catch falling power cores, unleash twin lasers, and defeat the Stage 6 Quantum Core.',
      keyboard: [
        'A / D, Arrows, or Mouse: Steer paddle',
        'SPACE: Launch ball from paddle / Fire twin lasers',
        'Catch glowing capsules for lasers, multiball & shields'
      ],
      mobile: [
        'Centred Paddle Slider or direct touch drag on canvas',
        '⚡ LASER (left): Fire twin destructive beam cannons',
        '🚀 LAUNCH & 💣 BOMB (right): Launch balls & clear matrices'
      ]
    }
  },
  astroPulse: {
    key: 'astroPulse',
    title: 'Astro Pulse',
    genre: 'Retro Vertical Space Shoot-Em-Up',
    tag: 'SHMUP',
    badge: 'SPACE SHMUP',
    controlMode: 'joystick',
    portraitDims: { width: 600, height: 800 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Move: 360° Joystick / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Smart Bomb: <kbd>SPACE</kbd> | Auto-Fire',
    hintText: '🕹️ CENTER JOYSTICK: FLY | ⚡ THRUST (LEFT) | 🚀 FIRE & 💣 BOMB (RIGHT)',
    primaryLabel: 'FIRE',
    subLabel: 'THRUST',
    superLabel: 'BOMB',
    primaryIcon: '🚀',
    subIcon: '⚡',
    superIcon: '💣',
    showSub: true,
    showSuper: true,
    showPrimary: true,
    hud: { hp: true, super: true, superText: 'BOMB' },
    briefing: {
      objective: 'Pilot the pulse starfighter through deep hyperspace, collect multi-beam lasers and micro-missiles, and eliminate the Mothership.',
      keyboard: [
        'WASD or Arrow Keys to navigate starfields',
        'SPACE: Deploy screen-clearing Smart Bomb',
        'Pulse cannons auto-fire with continuous upgrades'
      ],
      mobile: [
        'Centred 360° Analog Joystick for agile starfighter flight',
        '⚡ THRUST (left): Afterburner speed multiplier',
        '🚀 FIRE & 💣 BOMB (right): Laser barrage & Smart Bomb'
      ]
    }
  },
  neonDrift: {
    key: 'neonDrift',
    title: 'Neon Drift',
    genre: 'Highway Cyberpunk Outrun Racer',
    tag: 'RACING',
    badge: 'DRIFT RACER',
    controlMode: 'dpad',
    portraitDims: { width: 640, height: 800 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Steer: Drag on Road / D-Pad / <kbd>A</kbd><kbd>D</kbd> | Nitro: <kbd>SPACE</kbd> | Drift: <kbd>SHIFT</kbd>',
    hintText: '🕹️ CENTER D-PAD / DRAG ROAD | 💨 DRIFT (LEFT) | 🔥 NITRO (RIGHT)',
    primaryLabel: 'NITRO',
    subLabel: 'DRIFT',
    superLabel: '',
    primaryIcon: '🔥',
    subIcon: '💨',
    superIcon: '⚡',
    showSub: true,
    showSuper: false,
    showPrimary: true,
    hud: { hp: true, super: true, superText: 'NITRO' },
    briefing: {
      objective: 'Blaze through neon highway traffic, power-drift through sharp turns, collect nitro capsules, and outrun interceptors.',
      keyboard: [
        'A / D, Left/Right Arrows or Mouse: Steer vehicle',
        'W / SPACE: Ignite Nitro Afterburners',
        'S / SHIFT: Initiate Power Drift around corners'
      ],
      mobile: [
        'Centred steering D-Pad or direct finger drag on road',
        '💨 DRIFT (left): Hold to initiate smooth power-drift',
        '🔥 NITRO (right): Ignite afterburners for top speed'
      ]
    }
  },
  hexaTron: {
    key: 'hexaTron',
    title: 'Hexa-Tron',
    genre: 'Light-Cycle Cyber Arena Duel',
    tag: 'CYBER ARENA',
    badge: 'GRID DUEL',
    controlMode: 'dpad',
    portraitDims: { width: 720, height: 720 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Steer: D-Pad / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Phase Jump: <kbd>SPACE</kbd> | Nitro: <kbd>SHIFT</kbd>',
    hintText: '🕹️ CENTER D-PAD: TURN | ⚡ NITRO (LEFT) | 🚀 JUMP (RIGHT)',
    primaryLabel: 'JUMP',
    subLabel: 'NITRO',
    superLabel: '',
    primaryIcon: '🚀',
    subIcon: '⚡',
    superIcon: '💣',
    showSub: true,
    showSuper: false,
    showPrimary: true,
    hud: { hp: true, super: true, superText: 'SHIELD' },
    briefing: {
      objective: 'Maneuver high-speed lightcycles on the neon grid, box in rival AI cycles with light ribbons, and leap over obstacles.',
      keyboard: [
        'WASD or Arrow Keys: Instant 90° cycle turns',
        'SPACE: Phase Jump cleanly over light ribbons',
        'SHIFT: Nitro acceleration | E: Drop EMP ribbon clearer'
      ],
      mobile: [
        'Centred directional D-Pad for sharp 90° turns',
        '⚡ NITRO (left): High-velocity cycle boost',
        '🚀 JUMP (right): Phase Jump cleanly over light trails'
      ]
    }
  },
  cyberPacman: {
    key: 'cyberPacman',
    title: 'Cyber Pacman',
    genre: 'Cyberpunk Drone Grid Chomp',
    tag: 'MAZE CHOMP',
    badge: 'ARCADE MAZE',
    controlMode: 'toggle',
    portraitDims: { width: 640, height: 580 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Steer: D-Pad / Joystick / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | EMP Stun: <kbd>SPACE</kbd>',
    hintText: '🕹️ CENTER D-PAD / STICK: STEER | ⚡ EMP STUN (RIGHT)',
    primaryLabel: 'EMP STUN',
    subLabel: '',
    superLabel: '',
    primaryIcon: '⚡',
    subIcon: '🕹️',
    superIcon: '💣',
    showSub: false,
    showSuper: false,
    showPrimary: true,
    hud: { hp: true, super: true, superText: 'EMP' },
    briefing: {
      objective: 'Infiltrate neon server grids, devour all encrypted data bits, grab Power Cores to turn the tables on rogue hunter drones, and stun with EMP.',
      keyboard: [
        'WASD or Arrow Keys: Steer through grid corridors',
        'SPACE: Trigger EMP Stun Pulse (freezes all drones)',
        'Chomp flashing Power Cores to make drones vulnerable'
      ],
      mobile: [
        'Centred 4-direction D-Pad (or 360° Joystick in stick mode)',
        '🕹️/🎛️ STICK TOGGLE (left): Switch between D-Pad and Stick',
        '⚡ EMP STUN (right): Freeze all hunter drones in place'
      ]
    }
  }
};

export const VALID_GAME_KEYS = Object.freeze(Object.keys(GAMES_METADATA));

export function getGameMeta(key) {
  return GAMES_METADATA[key] || null;
}
