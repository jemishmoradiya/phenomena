// Single source of truth for static gallery data: every mode's id/family/label/note,
// palettes, default settings, interaction types, and quality-independent constants.
// See CLAUDE.md's "State and config flow" section.
export const MODES = [
  { id: "drift", label: "Drift", note: "ideas arriving without direction" },
  { id: "orbit", group: "cosmic", label: "Orbit", note: "attention finding a rhythm" },
  { id: "resolve", group: "mathematical", label: "Resolve", note: "fragments becoming whole" },
  { id: "bloom", group: "mathematical", label: "Bloom", note: "one thought opening into another" },
  { id: "signal", label: "Signal", note: "a message moving through noise" },
  { id: "vortex", group: "physics", label: "Vortex", note: "possibility pulled toward a center" },
  { id: "murmuration", label: "Murmuration", note: "many instincts moving as one" },
  { id: "constellation", label: "Constellation", note: "distant ideas discovering a link" },
  { id: "magnetic", group: "physics", label: "Magnetic", note: "attention held between two poles" },
  { id: "phase", group: "physics", label: "Phase Shift", note: "order dissolving into possibility" },
  { id: "neural", label: "Neural Inference", note: "a signal becoming an answer" },
  { id: "vectorfield", group: "physics", label: "Vector Field", note: "reasoning following invisible forces" },
  { id: "fireworks", group: "physics", label: "Fireworks", note: "rising shells becoming light, smoke, and falling embers" },
  { id: "cymatics", group: "acoustics", label: "Cymatics", note: "vibration guiding sand toward silent nodes" },
  { id: "levitation", group: "acoustics", label: "Acoustic Levitation", note: "ultrasonic pressure holding matter in mid-air" },
  { id: "neuralpulse", label: "Neural Pulse", note: "energy travelling through a network" },
  { id: "aurora", group: "physics", label: "Aurora Ribbon", note: "a continuous current of thought" },
  { id: "emergent", label: "Emergent Intelligence", note: "information organizing itself into understanding" },
  { id: "garbage", label: "Garbage Collector", note: "memory preserving what still matters" },
  { id: "context", label: "Context Window", note: "new information displacing the oldest" },
  { id: "cache", label: "Cache Warmup", note: "frequent knowledge becoming immediately available" },
  { id: "consensus", label: "Distributed Consensus", note: "independent opinions becoming one decision" },
  { id: "accretion", group: "cosmic", label: "Accretion Disk", note: "matter surrendering to gravity" },
  { id: "binary", group: "cosmic", label: "Binary Stars", note: "two bodies sharing one rhythm" },
  { id: "collision", group: "cosmic", label: "Galaxy Collision", note: "two histories becoming one" },
  { id: "supernova", group: "cosmic", label: "Supernova", note: "collapse transformed into expansion" },
  { id: "cosmicweb", group: "cosmic", label: "Cosmic Web", note: "gravity threading the universe together" },
  { id: "countdown", group: "cosmic", label: "Cosmic Countdown", note: "the universe gathering into a signal" },
  { id: "eclipse", group: "cosmic", label: "Earth–Moon Eclipse", note: "three bodies falling into alignment" },
  { id: "nebula", group: "cosmic", label: "Nebula Birth", note: "cold gas collapsing until stars ignite" },
  { id: "solarsystem", group: "cosmic", label: "Solar System", note: "many worlds keeping time around one star" },
  { id: "spiralgalaxy", group: "cosmic", label: "Spiral Galaxy", note: "stellar arms turning around a dense galactic core" },
  { id: "blackholelensing", group: "cosmic", label: "Black Hole Lensing", note: "background light bending around invisible gravity" },
  { id: "cometpassage", group: "cosmic", label: "Comet Passage", note: "an icy body drawing a luminous tail past its star" },
  { id: "pulsar", group: "cosmic", label: "Pulsar", note: "a rotating neutron star sweeping space with twin beams" },
  { id: "planetformation", group: "cosmic", label: "Planet Formation", note: "dust rings gathering into a family of worlds" },
  { id: "dna", group: "living", label: "DNA Sequence", note: "a code learning how to replicate" },
  { id: "rain", group: "living", label: "Rain Cycle", note: "water rising, gathering, and returning" },
  { id: "fission", group: "living", label: "Bacterial Fission", note: "one cell becoming a colony" },
  { id: "heartbeat", group: "living", label: "Anatomical Heart", note: "a living organ contracting in rhythm" },
  { id: "vine", group: "living", label: "Vine Growth", note: "a living stem searching for support" },
  { id: "docking", group: "living", label: "Molecular Docking", note: "two structures discovering a precise fit" },
  { id: "clockwork", group: "mechanical", label: "Celestial Clockwork", note: "precision held in coordinated motion" },
  { id: "bridge", group: "mechanical", label: "Suspension Bridge", note: "tension transforming parts into structure" },
  { id: "orchestra", group: "mechanical", label: "Orchestra Assembly", note: "independent voices becoming one system" },
  { id: "interference", group: "mathematical", label: "Wave Interference", note: "two rhythms discovering where they agree" },
  { id: "mobius", group: "mathematical", label: "Möbius Loop", note: "a path returning to itself from the other side" },
  { id: "attractor", group: "mathematical", label: "Strange Attractor", note: "motion that never repeats, yet never breaks its shape" },
  { id: "tessellation", group: "mathematical", label: "Tessellation", note: "space dividing itself without a gap" },
  { id: "current", group: "fluid", label: "Current", note: "many particles carried by one continuous flow" },
  { id: "inkdrift", group: "fluid", label: "Ink Drift", note: "pigment curling as it disperses through water" },
  { id: "droplet", group: "fluid", label: "Droplet", note: "surface tension drawing separate bodies together" },
  { id: "ripplepool", group: "fluid", label: "Ripple Pool", note: "waves travelling through a field of particles" },
  { id: "refraction", group: "light", label: "Refraction", note: "light changing direction as it enters a new medium" },
  { id: "prism", group: "light", label: "Prism", note: "one beam separating into distinct paths" },
  { id: "lens", group: "light", label: "Lens", note: "scattered rays gathering at a single focus" },
  { id: "doubleslit", group: "light", label: "Double Slit", note: "individual particles accumulating into interference" },
  { id: "caustics", group: "light", label: "Caustics", note: "curved rays concentrating into shifting bands" },
  { id: "brownian", group: "chemistry", label: "Brownian Motion", note: "molecules wandering through constant collisions" },
  { id: "reaction", group: "chemistry", label: "Reaction", note: "separate reactants becoming a shared product" },
  { id: "crystallization", group: "chemistry", label: "Crystallization", note: "disordered particles settling into a lattice" },
  { id: "catalysis", group: "chemistry", label: "Catalysis", note: "reaction pathways gathering around active sites" },
  { id: "diffusion", group: "chemistry", label: "Diffusion", note: "two molecular populations becoming evenly mixed" },
  { id: "windtunnel", group: "atmosphere", label: "Wind Tunnel", note: "airflow dividing and reconnecting around an obstacle" },
  { id: "convection", group: "atmosphere", label: "Convection", note: "warm air rising as cooler air returns" },
  { id: "stormcell", group: "atmosphere", label: "Storm Cell", note: "pressure and rotation organizing a growing system" },
  { id: "snowfall", group: "atmosphere", label: "Snowfall", note: "light particles descending through changing wind" },
  { id: "pressurefront", group: "atmosphere", label: "Pressure Front", note: "two air masses folding along a moving boundary" },
  { id: "sanddunes", group: "earth", label: "Sand Dunes", note: "grains migrating into ridges under steady wind" },
  { id: "erosion", group: "earth", label: "Erosion", note: "a rigid formation gradually becoming a slope" },
  { id: "sedimentation", group: "earth", label: "Sedimentation", note: "suspended material settling into distinct layers" },
  { id: "crystalgrowth", group: "earth", label: "Crystal Growth", note: "a mineral structure extending along ordered branches" },
  { id: "tectonic", group: "earth", label: "Tectonic Stress", note: "two plates storing pressure before they slip" },
  { id: "quantumtunnel", group: "quantum", label: "Quantum Tunnel", note: "some particles appearing beyond an energy barrier" },
  { id: "probabilitycloud", group: "quantum", label: "Probability Cloud", note: "many observations revealing where a particle may be" },
  { id: "entanglement", group: "quantum", label: "Entanglement", note: "distant pairs preserving one shared state" },
  { id: "quantumwell", group: "quantum", label: "Quantum Well", note: "particles occupying discrete energy levels" },
  { id: "waveparticle", group: "quantum", label: "Wave–Particle", note: "one system alternating between paths and waves" },
  { id: "warpfield", group: "future", label: "Warp Field", note: "space compressing ahead and expanding behind" },
  { id: "nanobot", group: "future", label: "Nanobot Assembly", note: "independent machines coordinating into one structure" },
  { id: "teleportation", group: "future", label: "Teleportation", note: "matter dissolving into information and rebuilding elsewhere" },
  { id: "plasma", group: "future", label: "Plasma Containment", note: "charged particles held inside a magnetic torus" },
  { id: "swarmintelligence", group: "future", label: "Swarm Intelligence", note: "autonomous agents discovering a shared formation" },
  { id: "dysonswarm", group: "future", label: "Dyson Swarm", note: "orbiting collectors gradually surrounding a star" },
];

export const FAMILY_LABELS = {
  thought: "Thought phenomenon",
  cosmic: "Cosmic phenomenon",
  living: "Living phenomenon",
  physics: "Physical phenomenon",
  mathematical: "Mathematical phenomenon",
  mechanical: "Mechanical phenomenon",
  acoustics: "Acoustic phenomenon",
  fluid: "Fluid phenomenon",
  light: "Optical phenomenon",
  chemistry: "Chemical phenomenon",
  atmosphere: "Atmospheric phenomenon",
  earth: "Earth phenomenon",
  quantum: "Quantum phenomenon",
  future: "Future phenomenon",
};

export const COLLECTIONS = [
  { id: "thought", label: "Thought" },
  { id: "cosmic", label: "Cosmic" },
  { id: "living", label: "Living" },
  { id: "physics", label: "Physics" },
  { id: "mathematical", label: "Math" },
  { id: "mechanical", label: "Mechanical" },
  { id: "acoustics", label: "Sound" },
  { id: "fluid", label: "Fluid" },
  { id: "light", label: "Light" },
  { id: "chemistry", label: "Chemistry" },
  { id: "atmosphere", label: "Atmosphere" },
  { id: "earth", label: "Earth" },
  { id: "quantum", label: "Quantum" },
  { id: "future", label: "Future" },
];

export const PALETTES = [
  { id: "porcelain", label: "Porcelain", background: "#f3f0e8", stageInk: "#191714", stageMuted: "#6f685f", connection: "#39342e", metal: "#151412", colors: ["#191714", "#746d63", "#b08b55"] },
  { id: "obsidian", label: "Obsidian", background: "#0c0d0d", stageInk: "#f2efe7", stageMuted: "#9d9a93", connection: "#c7c4bc", metal: "#aeb4b0", colors: ["#f2efe7", "#a9ada9", "#ffffff"] },
  { id: "cobalt", label: "Cobalt", background: "#07111f", stageInk: "#edf7ff", stageMuted: "#8da7c2", connection: "#77c8ff", metal: "#173d68", colors: ["#edf7ff", "#77c8ff", "#316cff"] },
  { id: "solar", label: "Solar", background: "#17100b", stageInk: "#fff1d8", stageMuted: "#bd9878", connection: "#ffb547", metal: "#6b2d16", colors: ["#fff0c9", "#ffb547", "#f25f3a"] },
  { id: "biolume", label: "Biolume", background: "#071512", stageInk: "#e9fff7", stageMuted: "#86aa9c", connection: "#63e6be", metal: "#0b5c48", colors: ["#e7fff5", "#63e6be", "#18a77c"] },
  { id: "ultraviolet", label: "Ultraviolet", background: "#10091f", stageInk: "#f7efff", stageMuted: "#aa9abd", connection: "#b487ff", metal: "#41276f", colors: ["#f7efff", "#c596ff", "#7657ff"] },
];

export const UI_THEME = { background: "#f1efe8", panel: "#fbfaf6", ink: "#181614", muted: "#6f675f", border: "#c8c1b8" };

export const INTERACTIONS = [
  { id: "attract", label: "Attract" },
  { id: "repel", label: "Repel" },
  { id: "swirl", label: "Swirl" },
  { id: "none", label: "Still" },
];

export const MAX_PARTICLES = 420;
export const TAU = Math.PI * 2;
export const REDUCED_MOTION_TIMES = {
  countdown: 6.5, dna: 4, neural: 6.2, eclipse: 7, rain: 3, fission: 11,
  vectorfield: 2, neuralpulse: 3, aurora: 2.5, heartbeat: 0.65, emergent: 9.8,
  clockwork: 4, garbage: 6.5, context: 4, cache: 4.5, consensus: 8,
  vine: 7, nebula: 8, docking: 7, bridge: 8, orchestra: 8, tessellation: 2,
  current: 2, inkdrift: 3, droplet: 7, ripplepool: 1.5,
  refraction: 2, prism: 2, lens: 2, doubleslit: 3, caustics: 3,
  brownian: 2, reaction: 6.5, crystallization: 7, catalysis: 3, diffusion: 7,
  windtunnel: 2, convection: 3, stormcell: 3, snowfall: 4, pressurefront: 3,
  sanddunes: 3, erosion: 7, sedimentation: 4, crystalgrowth: 6, tectonic: 6.5,
  quantumtunnel: 3, probabilitycloud: 3, entanglement: 3, quantumwell: 3, waveparticle: 7,
  warpfield: 3, nanobot: 7, teleportation: 5, plasma: 3, swarmintelligence: 7, dysonswarm: 3,
  solarsystem: 3, spiralgalaxy: 3, blackholelensing: 3, cometpassage: 3, pulsar: 3, planetformation: 7,
};

export const RAIN_CLOUD_LOBES = [
  { x: -0.4, y: -0.34, rx: 0.25, ry: 0.13 }, { x: -0.2, y: -0.43, rx: 0.29, ry: 0.19 },
  { x: 0.06, y: -0.48, rx: 0.32, ry: 0.22 }, { x: 0.31, y: -0.4, rx: 0.29, ry: 0.17 },
  { x: 0.48, y: -0.32, rx: 0.21, ry: 0.11 },
];

export const NEURAL_PULSE_NODES = [
  { x: -0.7, y: -0.12 }, { x: -0.42, y: -0.48 }, { x: -0.34, y: 0.38 }, { x: 0, y: -0.18 },
  { x: 0.08, y: 0.46 }, { x: 0.38, y: -0.48 }, { x: 0.48, y: 0.2 }, { x: 0.72, y: -0.02 },
];
export const NEURAL_PULSE_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7]];

export const TESSELLATION_CELLS_A = [
  { x: -0.62, y: -0.58 }, { x: 0.02, y: -0.66 }, { x: 0.6, y: -0.54 },
  { x: -0.58, y: 0.04 }, { x: 0.06, y: 0 }, { x: 0.56, y: 0.06 },
  { x: -0.6, y: 0.58 }, { x: 0, y: 0.62 }, { x: 0.58, y: 0.56 },
];

export const TESSELLATION_CELLS_B = [
  { x: -0.36, y: -0.7 }, { x: 0.3, y: -0.62 }, { x: 0.68, y: -0.2 },
  { x: -0.7, y: -0.24 }, { x: -0.1, y: -0.06 }, { x: 0.34, y: 0.22 },
  { x: -0.34, y: 0.32 }, { x: 0.06, y: 0.66 }, { x: 0.62, y: 0.6 },
];

export const DEFAULT_SETTINGS = {
  speed: 1,
  energy: 1,
  density: 0.42,
  size: 1,
  trail: 0,
  interaction: "attract",
  interactionStrength: 0.65,
  interactionRadius: 0.5,
  quality: "auto",
  seed: 17,
  seedLocked: false,
  revision: 0,
  paused: false,
};
