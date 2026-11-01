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
    hintText: '🕹️ 360° JOYSTICK: MOVE | 💣 NOVA | ⚡ BOOST',
    primaryLabel: 'SUPER EMP',
    subLabel: 'BOOST',
    superLabel: 'NOVA',
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
        '360° Analog Joystick (left) to steer',
        '💣 NOVA: Screen-clearing EMP blast',
        '⚡ BOOST: Quick thruster evasion',
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
    portraitDims: { width: 800, height: 600 },
    desktopDims: { width: 800, height: 600 },
    instructions: 'Flip Gravity: <kbd>SPACE</kbd> or Click | Air-Dash: Tap while airborne | Dodge Spikes',
    hintText: '🕹️ TAP SCREEN / 🅰️ TO FLIP GRAVITY',
    primaryLabel: 'JUMP / FLIP',
    subLabel: 'AIR DASH',
    superLabel: 'BURST',
    hud: { hp: false, super: false },
    briefing: {
      objective: 'Sprint through high-speed hazard corridors, flip gravity between floor and ceiling, and rocket dash over spikes.',
      keyboard: [
        'SPACE / Up Arrow / Click: Flip Gravity',
        'Tap SPACE while airborne: Rocket Air-Dash',
        'Collect gold stars to ramp score multiplier up to 5x'
      ],
      mobile: [
        'Tap anywhere on Canvas or 🅰️: Flip Gravity',
        '⚡ AIR DASH: Thruster dash while airborne',
        'Collect gold stars for 5x score multiplier'
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
    hintText: '🕹️ DRAG SCREEN TO MOVE PADDLE | 🅰️ LAUNCH / FIRE',
    primaryLabel: 'LAUNCH / FIRE',
    subLabel: 'LASER',
    superLabel: 'BOMB',
    hud: { hp: false, super: false },
    briefing: {
      objective: 'Demolish quantum defense matrices, catch falling power cores, unleash twin lasers, and defeat the Stage 6 Quantum Core.',
      keyboard: [
        'A / D, Arrows, or Mouse: Steer paddle',
        'SPACE: Launch ball from paddle / Fire twin lasers',
        'Catch glowing capsules for lasers, multiball & shields'
      ],
      mobile: [
        'Touch & drag directly on canvas to slide paddle',
        'Tap Screen or 🅰️ LAUNCH: Launch ball & fire lasers',
        'Optional bottom slider available for thumb control'
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
    hintText: '🕹️ 360° JOYSTICK: FLY | 💣 SMART BOMB | 🅰️ FIRE',
    primaryLabel: 'FIRE',
    subLabel: 'THRUST',
    superLabel: 'SMART BOMB',
    hud: { hp: true, super: true, superText: 'BOMB' },
    briefing: {
      objective: 'Pilot the pulse starfighter through deep hyperspace, collect multi-beam lasers and micro-missiles, and eliminate the Mothership.',
      keyboard: [
        'WASD or Arrow Keys to navigate starfields',
        'SPACE: Deploy screen-clearing Smart Bomb',
        'Pulse cannons auto-fire with continuous upgrades'
      ],
      mobile: [
        '360° Analog Joystick (left) for precision flight',
        '💣 SMART BOMB: Annihilate all on-screen hostiles',
        '🅰️ FIRE: Hold for maximum continuous cannon barrage'
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
    hintText: '🕹️ DRAG ROAD / D-PAD TO STEER | ⚡ DRIFT | 🅰️ NITRO',
    primaryLabel: 'NITRO',
    subLabel: 'DRIFT',
    superLabel: 'BOOST',
    hud: { hp: true, super: true, superText: 'NITRO' },
    briefing: {
      objective: 'Blaze through neon highway traffic, power-drift through sharp turns, collect nitro capsules, and outrun interceptors.',
      keyboard: [
        'A / D, Left/Right Arrows or Mouse: Steer vehicle',
        'W / SPACE: Ignite Nitro Afterburners',
        'S / SHIFT: Initiate Power Drift around corners'
      ],
      mobile: [
        'Drag finger across road or tap Left/Right D-Pad to steer',
        '🅰️ NITRO: Full afterburner boost',
        '⚡ DRIFT: Hold while cornering to execute power drift'
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
    hintText: '🕹️ D-PAD: TURN | 🅰️ PHASE JUMP | ⚡ NITRO',
    primaryLabel: 'PHASE JUMP',
    subLabel: 'NITRO',
    superLabel: 'EMP BLAST',
    hud: { hp: true, super: true, superText: 'SHIELD' },
    briefing: {
      objective: 'Maneuver high-speed lightcycles on the neon grid, box in rival AI cycles with light ribbons, and leap over obstacles.',
      keyboard: [
        'WASD or Arrow Keys: Instant 90° cycle turns',
        'SPACE: Phase Jump cleanly over light ribbons',
        'SHIFT: Nitro acceleration | E: Drop EMP ribbon clearer'
      ],
      mobile: [
        'Left D-Pad: Instant 90° directional turns',
        '🅰️ PHASE JUMP: Aerial leap over lethal light trails',
        '⚡ NITRO: Speed boost | 💣 EMP: Vaporize obstacles'
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
    hintText: '🕹️ D-PAD / STICK: STEER | 🅰️ EMP STUN',
    primaryLabel: 'EMP STUN',
    subLabel: 'SPEED',
    superLabel: 'EMP BLAST',
    hud: { hp: true, super: true, superText: 'EMP' },
    briefing: {
      objective: 'Infiltrate neon server grids, devour all encrypted data bits, grab Power Cores to turn the tables on rogue hunter drones, and stun with EMP.',
      keyboard: [
        'WASD or Arrow Keys: Steer through grid corridors',
        'SPACE: Trigger EMP Stun Pulse (freezes all drones)',
        'Chomp flashing Power Cores to make drones vulnerable'
      ],
      mobile: [
        'Ergonomic D-Pad or 360° Joystick (toggle with 🎛️ button)',
        '🅰️ EMP STUN: Freeze all hunting drones instantly',
        'Devour Power Cores to counter-attack hunter drones'
      ]
    }
  }
};

export const VALID_GAME_KEYS = Object.freeze(Object.keys(GAMES_METADATA));

export function getGameMeta(key) {
  return GAMES_METADATA[key] || null;
}
