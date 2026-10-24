/* Designs and photo backgrounds, shared by the TV (tv/app.js) and the phone remote (remote/index.html). */
window.NOVA_PRESETS = [
  ["misty-coast", "Misty coast"], ["quiet-cove", "Quiet cove"], ["forest-mist", "Forest mist"],
  ["mountain-valley", "Mountain valley"], ["desert-dunes", "Desert dunes"], ["blue-peaks", "Blue peaks"],
  ["city-dusk", "City at dusk"], ["golden-hour", "Golden hour"]
];

// A design is a whole look in one pick. Every part of it can still be changed row by row in Appearance.
window.NOVA_DESIGNS = [
  { id: "shore", name: "Shore", desc: "Glass tiles over a photo", p: { layout: "grid", tiles: "glass", labels: "both", logo: "white", font: "modern", clock: "show", bg: { type: "preset", id: "misty-coast" } } },
  { id: "icons", name: "App Icons", desc: "Colorful icons, like Apple TV", p: { layout: "icons", tiles: "brand", labels: "both", logo: "brand", font: "modern", clock: "show", bg: { type: "preset", id: "mountain-valley" } } },
  { id: "minimal", name: "Minimal", desc: "Just the time and your logos", p: { layout: "minimal", tiles: "clear", labels: "logo", logo: "white", font: "modern", clock: "show", bg: { type: "preset", id: "forest-mist" } } }
];
window.NOVA_LAYOUTS = ["grid", "icons", "minimal"];
