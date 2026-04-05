// Milwaukee Style Outlet Cover Plate
// NEMA 5-15 Standard US Duplex Outlet - exact dimensions
// All units in mm

// ---- Plate dimensions (standard US single gang) ----
pw = 69.85;   // width
ph = 114.3;   // height  
pt = 3.175;   // thickness (~1/8 inch)
cr = 2.5;     // corner radius

// ---- Outlet openings (standard duplex, two sets of 3 holes) ----
// Each outlet has: 2 blade slots + 1 ground hole
// Top outlet center
t_cx = pw/2;
t_cy = ph * 0.65;

// Bottom outlet center
b_cx = pw/2;
b_cy = ph * 0.30;

// Blade slot dims
blade_w = 7;
blade_h = 12;
blade_r = 2;
blade_offset = 7.5; // left/right from center

// Ground hole
gnd_d = 7;
gnd_offset = 11; // below center

// Mounting screw hole
screw_d = 6.35;

// ---- Modules ----
module rounded_box(w, h, d, r) {
    hull() {
        translate([r,r,0])       cylinder(r=r, h=d, $fn=32);
        translate([w-r,r,0])     cylinder(r=r, h=d, $fn=32);
        translate([r,h-r,0])     cylinder(r=r, h=d, $fn=32);
        translate([w-r,h-r,0])   cylinder(r=r, h=d, $fn=32);
    }
}

module blade_slot() {
    translate([-blade_w/2, -blade_h/2, -1])
    hull() {
        translate([blade_r, blade_r, 0])     cylinder(r=blade_r, h=pt+2, $fn=24);
        translate([blade_w-blade_r, blade_r, 0]) cylinder(r=blade_r, h=pt+2, $fn=24);
        translate([blade_r, blade_h-blade_r, 0]) cylinder(r=blade_r, h=pt+2, $fn=24);
        translate([blade_w-blade_r, blade_h-blade_r, 0]) cylinder(r=blade_r, h=pt+2, $fn=24);
    }
}

module outlet(cx, cy) {
    // Left blade
    translate([cx - blade_offset, cy, 0]) blade_slot();
    // Right blade
    translate([cx + blade_offset, cy, 0]) blade_slot();
    // Ground (D-shaped, simplified as cylinder)
    translate([cx, cy - gnd_offset, -1])
        cylinder(d=gnd_d, h=pt+2, $fn=24);
}

// ---- Main plate ----
difference() {
    rounded_box(pw, ph, pt, cr);

    // Top outlet
    outlet(t_cx, t_cy);

    // Bottom outlet
    outlet(b_cx, b_cy);

    // Center mounting screw
    translate([pw/2, ph/2, -1])
        cylinder(d=screw_d, h=pt+2, $fn=32);
}

// ---- Raised text (Milwaukee on top, FUEL on bottom) ----
translate([pw/2, ph - 13, pt])
    linear_extrude(height=1.2)
        text("Milwaukee", size=8.5, font="Liberation Sans:style=Bold",
             halign="center", valign="center");

translate([pw/2, 9, pt])
    linear_extrude(height=1.2)
        text("FUEL", size=10, font="Liberation Sans:style=Bold",
             halign="center", valign="center");
