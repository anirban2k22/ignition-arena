// Dummy data for the MVP. Replace teams and VIPs from the Admin panel before the event.
const crypto = require('crypto');

const id = () => crypto.randomBytes(4).toString('hex');
const token = () => crypto.randomBytes(6).toString('base64url');

const TEAMS = [
  ['Team Inferno', 'Hellfire', 'Vertical spinner', 'A low, wide wedge with a hardened steel vertical disc that launches opponents into the air.'],
  ['Iron Vanguard', 'Juggernaut', 'Heavy pusher', 'Built like a tank. Four-wheel drive and a reinforced wedge that pins rivals against the arena wall.'],
  ['Volt Raiders', 'Shockwave', 'Drum spinner', 'A compact drum spinner that hits fast and low, designed to tear off wheels and armour.'],
  ['Titan Forge', 'Anvil', 'Hammer', 'An overhead pneumatic hammer with a 6 mm steel head. Slow, but every hit counts.'],
  ['Circuit Breakers', 'Overload', 'Flipper', 'A front-hinged flipper that turns bots over in under a second. Self-righting by design.'],
  ['Steel Phantoms', 'Wraith', 'Horizontal bar', 'A full-width horizontal bar spinner. Dangerous on the first hit, nervous on the counter.'],
  ['Mech Mavericks', 'Havoc', 'Lifter', 'A four-bar lifter with a grippy front plate. Plays the control game and waits for mistakes.'],
  ['Torque Titans', 'Crusher', 'Crusher', 'A slow hydraulic crushing jaw. Once it grabs you, the fight is usually over.'],
  ['Blade Runners', 'Spinner X', 'Shell spinner', 'A full-body shell spinner. The whole robot is the weapon.'],
  ['Gear Grinders', 'Grindstone', 'Drum spinner', 'A twin-tooth drum on a tough aluminium chassis. Built to survive and keep hitting.'],
  ['Nitro Knights', 'Lancer', 'Wedge', 'A pure speed wedge. Fast, agile, and built to out-drive bigger weapons.'],
  ['Rogue Robotics', 'Viper', 'Vertical spinner', 'A narrow vertical spinner with a two-tooth bar. Lean, mean and hard to hit.'],
  ['Kinetic Kings', 'Rampage', 'Hammer saw', 'An overhead saw arm that keeps attacking from above while the wedge holds position.'],
  ['Bolt Brigade', 'Thunderclap', 'Flipper', 'A rear-hinged flipper with a big pneumatic tank. Can throw a bot clean across the arena.'],
  ['Apex Engineers', 'Predator', 'Undercutter', 'A low horizontal undercutter. Gets under the wedge and goes for the wheels.'],
];

const COLORS = ['#FF4D1A', '#22E5FF', '#C6FF3D', '#FFD60A', '#A78BFA', '#FF3D7F', '#2E8BFF', '#34D399',
  '#F97316', '#38BDF8', '#E879F9', '#FACC15', '#4ADE80', '#F472B6', '#60A5FA'];

const VIPS = [
  ['Arjun Mehta', 'Chief Guest'], ['Priya Nair', 'Industry Partner'], ['Rohan Kapoor', 'Sponsor'],
  ['Sneha Iyer', 'Investor'], ['Vikram Rao', 'Faculty'], ['Ananya Sharma', 'Industry Partner'],
  ['Karthik Reddy', 'Sponsor'], ['Meera Pillai', 'Faculty'], ['Aditya Joshi', 'Investor'],
  ['Kavya Menon', 'Media Partner'], ['Siddharth Bose', 'Industry Partner'], ['Nisha Gupta', 'Faculty'],
  ['Rahul Desai', 'Sponsor'], ['Divya Krishnan', 'Investor'], ['Varun Malhotra', 'Chief Guest'],
  ['Ishita Banerjee', 'Industry Partner'], ['Nikhil Shetty', 'Faculty'], ['Pooja Kulkarni', 'Sponsor'],
  ['Aman Verma', 'Investor'], ['Tara Fernandes', 'Media Partner'],
];

const FANS = ['Aarav', 'Diya', 'Kabir', 'Saanvi', 'Vihaan', 'Myra', 'Reyansh', 'Anika', 'Ishaan', 'Zara'];

module.exports = function seed() {
  const now = Date.now();
  const startingCoins = 10000;
  const teams = TEAMS.map(([name, botName, weapon, description], i) => ({
    id: id(), name, botName, weapon, college: 'College to be confirmed', weight: '15 kg',
    description, color: COLORS[i % COLORS.length], photo: '',
  }));
  const vips = VIPS.map(([name, title]) => ({ id: id(), name, title, coins: startingCoins, token: token() }));

  const matches = [];
  for (let i = 0; i + 1 < teams.length; i += 2) {
    matches.push({
      id: id(), label: `Round 1 - Match ${i / 2 + 1}`, teamA: teams[i].id, teamB: teams[i + 1].id,
      status: i === 0 ? 'open' : 'upcoming', winner: null, result: null, createdAt: now + i,
    });
  }

  // A few sample bets and cheers on the first match so every screen has something to show.
  const m = matches[0];
  const bets = [];
  const sample = [[0, 'A', 2500], [1, 'B', 1500], [2, 'A', 1000], [3, 'B', 3000], [4, 'A', 500], [5, 'B', 800]];
  for (const [vi, side, amount] of sample) {
    const v = vips[vi];
    v.coins -= amount;
    bets.push({ id: id(), matchId: m.id, vipId: v.id, teamId: side === 'A' ? m.teamA : m.teamB, amount, ts: now - (6 - vi) * 20000 });
  }
  const audience = [];
  const cheers = { [m.id]: { [m.teamA]: {}, [m.teamB]: {} } };
  FANS.forEach((name, i) => {
    const teamId = i % 2 ? m.teamB : m.teamA;
    const pts = 40 + ((i * 37) % 120);
    const a = { id: id(), name, teamId, points: pts, joined: now - i * 60000 };
    audience.push(a);
    cheers[m.id][teamId][a.id] = pts;
  });

  return {
    version: 1,
    settings: {
      eventName: 'Ignition Challenge',
      coinName: 'Sparks',
      startingCoins,
      publicUrl: '',
      liveMatchId: m.id,
    },
    led: { template: 'bets', message: 'Welcome to the Ignition Challenge', showQR: true },
    teams, vips, matches, bets, audience, cheers,
    feed: [{ ts: now, type: 'system', text: 'Demo data loaded' }],
  };
};
