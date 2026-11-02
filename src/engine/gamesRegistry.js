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

export const EXPANSION_GAMES_METADATA = {
  cyberPinball: {
    key: 'cyberPinball',
    title: 'Cyber Pinball',
    genre: 'Neon Flipper Physics',
    tag: 'PINBALL',
    badge: 'EXPANSION',
    controlMode: 'buttons',
    portraitDims: { width: 600, height: 750 },
    desktopDims: { width: 600, height: 750 },
    instructions: 'Left Flipper: <kbd>A</kbd>/Left | Right Flipper: <kbd>D</kbd>/Right | Plunger: <kbd>SPACE</kbd>',
    hintText: '🕹️ FLIPPERS: LEFT & RIGHT | 🚀 PLUNGER: SPACE',
    primaryLabel: 'R FLIP',
    subLabel: 'L FLIP',
    superLabel: 'PLUNGE',
    primaryIcon: '🕹️',
    subIcon: '🕹️',
    superIcon: '🚀',
    showSub: true,
    showSuper: true,
    showPrimary: true,
    hud: { hp: true, super: false },
    briefing: {
      objective: 'Hit kinetic plasma bumpers, drop C-Y-B-E-R targets to trigger 3-ball Multiball Frenzy, and keep the ball in play!',
      keyboard: [
        'A / Left Arrow: Left Flipper',
        'D / Right Arrow: Right Flipper',
        'SPACE / Down Arrow: Hold to charge plunger, release to launch'
      ],
      mobile: [
        'L FLIP (left button): Engage left flipper',
        'R FLIP (right button): Engage right flipper',
        'PLUNGE (super button): Charge & launch spring plunger'
      ]
    }
  },
  voxelTankSiege: {
    key: 'voxelTankSiege',
    title: 'Voxel Tank Siege',
    genre: 'Tactical Arena Combat',
    tag: 'TACTICAL',
    badge: 'EXPANSION',
    controlMode: 'joystick',
    portraitDims: { width: 720, height: 720 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Drive: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Fire: <kbd>SPACE</kbd> / Click | Mine: <kbd>SHIFT</kbd>',
    hintText: '🕹️ DRIVE: JOYSTICK | 💥 FIRE: RIGHT | 💣 MINE: LEFT',
    primaryLabel: 'FIRE',
    subLabel: 'MINE',
    superLabel: '',
    primaryIcon: '💥',
    subIcon: '💣',
    superIcon: '',
    showSub: true,
    showSuper: false,
    showPrimary: true,
    hud: { hp: true, super: false },
    briefing: {
      objective: 'Drive an armored cyber tank, bounce shells off arena walls, blast destructible barricades, and deploy proximity mines.',
      keyboard: [
        'WASD or Arrow Keys to maneuver chassis',
        'Mouse / Direction to aim turret, SPACE or Click to fire ricochet cannon',
        'SHIFT: Drop timed proximity energy mine'
      ],
      mobile: [
        'Centred 360° Joystick: Steer tank chassis',
        '💥 FIRE (right): Discharge ricocheting plasma shell',
        '💣 MINE (left): Deploy high-yield energy mine'
      ]
    }
  },
  synthBlade: {
    key: 'synthBlade',
    title: 'Synth Blade',
    genre: 'Rhythm Beat Slasher',
    tag: 'RHYTHM',
    badge: 'EXPANSION',
    controlMode: 'buttons',
    portraitDims: { width: 600, height: 700 },
    desktopDims: { width: 600, height: 700 },
    instructions: 'Lanes: <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd> <kbd>↓</kbd> <kbd>↑</kbd> <kbd>→</kbd>',
    hintText: '🎵 STRIKE 4 LANES IN TIME WITH SYNTH BEATS',
    primaryLabel: 'K / →',
    subLabel: 'D / ←',
    superLabel: '',
    primaryIcon: '⚡',
    subIcon: '⚡',
    superIcon: '',
    showSub: true,
    showSuper: false,
    showPrimary: true,
    hud: { hp: true, super: false },
    briefing: {
      objective: 'Slash notes flowing down 4 matrix lanes in tempo with synthwave drops. Reach 20 combo to activate Fever Mode 4x!',
      keyboard: [
        'D, F, J, K keys (or Left, Down, Up, Right arrows) for Lanes 1, 2, 3, 4',
        'Time strikes precisely as notes cross the lower target line',
        'Build streak to enter Fever Mode with 4x scoring'
      ],
      mobile: [
        'Tap the 4 interactive lane buttons at bottom of screen',
        'Hit within target line for PERFECT (+200) or GREAT (+100)',
        'Maintain high combo to unlock Fever Mode aura'
      ]
    }
  },
  laserMatrix: {
    key: 'laserMatrix',
    title: 'Laser Matrix',
    genre: 'Optical Quantum Puzzle',
    tag: 'PUZZLE',
    badge: 'EXPANSION',
    controlMode: 'buttons',
    portraitDims: { width: 650, height: 650 },
    desktopDims: { width: 700, height: 650 },
    instructions: 'Rotate Mirrors: Click / Tap mirrors to reflect laser into target cores',
    hintText: '🔮 TAP MIRRORS TO REDIRECT LASER BEAMS',
    primaryLabel: 'ROTATE',
    subLabel: '',
    superLabel: '',
    primaryIcon: '🔄',
    subIcon: '',
    superIcon: '',
    showSub: false,
    showSuper: false,
    showPrimary: true,
    hud: { hp: false, super: false },
    briefing: {
      objective: 'Guide laser beams through a quantum matrix by rotating angled mirrors 45° to power all target cores.',
      keyboard: [
        'Click on any mirror with mouse to rotate 45 degrees',
        'Laser beam reflects in real-time based on mirror angle',
        'Power all green target cores to clear stage and advance'
      ],
      mobile: [
        'Tap mirrors directly on the touch screen grid to rotate',
        'Clear all 5 progressive optical quantum puzzles'
      ]
    }
  }
};

export const EXPANSION_GAME_KEYS = Object.freeze(Object.keys(EXPANSION_GAMES_METADATA));
export const ALL_GAME_KEYS = Object.freeze([...VALID_GAME_KEYS, ...EXPANSION_GAME_KEYS]);

export function getGameMeta(key) {
  return GAMES_METADATA[key] || EXPANSION_GAMES_METADATA[key] || null;
}
