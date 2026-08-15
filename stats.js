// ============================================================
// Paralation - stats.js
// Matt's RPG stat block. The parasite is why the numbers go up.
// Live today: spd (walk speed), sta (sprint fuel), xp/level.
// Stored for future real-time combat: str, dex, int, aspd.
// ============================================================
const STATS = (() => {
  const s = {
    level: 1, xp: 0,
    str: 5,    // strength: future melee damage / lifting
    dex: 5,    // dexterity: future dodge / precision
    int: 8,    // intellect: he is a nerd, this one starts high
    spd: 10,   // speed: walk speed = 80 + spd px/s
    aspd: 5,   // attack speed: future swing rate
    sta: 20, staMax: 20,
  };
  function xpNext() { return Math.round(20 * Math.pow(1.35, s.level - 1)); }
  function levelUp() {
    s.level++;
    s.str++; s.dex++; s.int++; s.spd++; s.aspd++;
    s.staMax += 2;
    s.sta = s.staMax; // level up fully restores stamina
  }
  // add xp; returns array of levels reached (empty if none)
  function grant(amount) {
    s.xp += amount;
    const ups = [];
    while (s.xp >= xpNext()) { s.xp -= xpNext(); levelUp(); ups.push(s.level); }
    return ups;
  }
  function walkSpeed() { return 80 + s.spd; }
  return { s: s, xpNext: xpNext, grant: grant, walkSpeed: walkSpeed };
})();
