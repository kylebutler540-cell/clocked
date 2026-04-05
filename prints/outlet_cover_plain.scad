// Standard US Single-Gang Duplex Outlet Cover Plate
// NEMA 5-15 - Exact real-world dimensions
// No text - clean base plate

// ---- Plate (2.75" x 4.5" x 0.125") ----
pw = 69.85;    // 2.75"
ph = 114.3;    // 4.50"
pt = 3.175;    // 0.125" thick
cr = 2.0;      // corner radius

// ---- Outlet openings ----
// Each: 34.13mm W x 28.575mm H, rounded corners
// Centers 46.04mm apart, centered on plate
ow = 34.13;    // opening width  (1-11/32")
oh = 28.575;   // opening height (1-1/8")
or_ = 3.5;     // opening corner radius
spacing = 46.04; // center-to-center (1-13/16")

cx = pw / 2;
cy = ph / 2;
top_cy = cy + spacing / 2;
bot_cy = cy - spacing / 2;

// ---- Mounting screw hole ----
screw_d = 5.5;

// ---- Modules ----
module rounded_box(w, h, d, r) {
    hull() {
        translate([r, r, 0])     cylinder(r=r, h=d, $fn=32);
        translate([w-r, r, 0])   cylinder(r=r, h=d, $fn=32);
        translate([r, h-r, 0])   cylinder(r=r, h=d, $fn=32);
        translate([w-r, h-r, 0]) cylinder(r=r, h=d, $fn=32);
    }
}

module outlet_opening() {
    translate([-ow/2, -oh/2, -1])
    hull() {
        translate([or_, or_, 0])        cylinder(r=or_, h=pt+2, $fn=24);
        translate([ow-or_, or_, 0])     cylinder(r=or_, h=pt+2, $fn=24);
        translate([or_, oh-or_, 0])     cylinder(r=or_, h=pt+2, $fn=24);
        translate([ow-or_, oh-or_, 0])  cylinder(r=or_, h=pt+2, $fn=24);
    }
}

// ---- Build plate ----
difference() {
    rounded_box(pw, ph, pt, cr);

    // Top outlet opening
    translate([cx, top_cy, 0]) outlet_opening();

    // Bottom outlet opening
    translate([cx, bot_cy, 0]) outlet_opening();

    // Center mounting screw
    translate([cx, cy, -1]) cylinder(d=screw_d, h=pt+2, $fn=32);
}
