// The server is the only place that decides points.
// `labels` are Rekognition label names; a photo passes if it contains at least one
// of them with enough confidence. Tune these with real photos after first deploy.
export const MIN_CONFIDENCE = 55;

export const ACTIVITY_TYPES = {
  'road-cleaning': {
    hint: 'Show the litter you picked up, or the cleaned stretch of road.',
    label: 'Road cleaning',
    points: 30,
    labels: ['Litter', 'Trash', 'Garbage', 'Rubbish', 'Waste', 'Broom', 'Cleaning', 'Sweeping', 'Plastic', 'Recycling', 'Glove', 'Trash Can'],
  },
  'tree-planting': {
    hint: 'Show the sapling or plant going into the soil.',
    label: 'Tree planting',
    points: 50,
    labels: ['Plant', 'Tree', 'Sapling', 'Seedling', 'Gardening', 'Soil', 'Shovel', 'Garden', 'Vegetation', 'Potted Plant'],
  },
  'waste-segregation': {
    hint: 'Show your sorted bins or separated recyclables.',
    label: 'Waste segregation',
    points: 20,
    labels: ['Recycling', 'Trash', 'Garbage', 'Waste', 'Bin', 'Trash Can', 'Plastic', 'Bottle', 'Tin', 'Can', 'Paper', 'Cardboard'],
  },
  'public-transport': {
    hint: 'Show the bus, train, metro or your bicycle.',
    label: 'Public transport / cycling',
    points: 15,
    labels: ['Bus', 'Train', 'Subway', 'Tram', 'Metro', 'Bicycle', 'Bike', 'Cycling', 'Railway', 'Train Station', 'Public Transport', 'Terminal'],
  },
  'plastic-free': {
    hint: 'Show your cloth bag, steel bottle or other reusable item.',
    label: 'Plastic-free choice',
    points: 10,
    labels: ['Bag', 'Tote Bag', 'Basket', 'Cloth', 'Cotton', 'Jute', 'Water Bottle', 'Steel', 'Reusable'],
  },
};

export function publicCatalog() {
  return Object.fromEntries(
    Object.entries(ACTIVITY_TYPES).map(([id, a]) => [id, { label: a.label, points: a.points, hint: a.hint }]),
  );
}

// labels: [{ Name, Confidence }] as returned by Rekognition DetectLabels.
export function evaluateLabels(type, labels) {
  const activity = ACTIVITY_TYPES[type];
  if (!activity) return { ok: false, matched: [] };
  const wanted = new Set(activity.labels.map((l) => l.toLowerCase()));
  const matched = (labels || [])
    .filter((l) => (l.Confidence ?? 0) >= MIN_CONFIDENCE && wanted.has(String(l.Name).toLowerCase()))
    .map((l) => l.Name);
  return { ok: matched.length > 0, matched };
}

// Demo reward catalogue: redeeming spends points and returns a code. No real vouchers are issued.
export const REWARDS = {
  certificate: { title: 'Digital certificate', description: 'A signed e-certificate of appreciation.', cost: 50 },
  sapling: { title: 'Free sapling', description: 'A sapling to plant near you.', cost: 120 },
  'cloth-bag': { title: 'Cloth bag', description: 'A reusable cotton shopping bag.', cost: 250 },
  'steel-bottle': { title: 'Steel bottle', description: 'An insulated reusable bottle.', cost: 500 },
  'tree-in-name': { title: 'Tree in your name', description: 'A tree planted by a partner NGO in your name.', cost: 800 },
};

export function publicRewards() {
  return Object.entries(REWARDS).map(([id, r]) => ({ id, ...r }));
}
