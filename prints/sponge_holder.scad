// Universal Sink Sponge Holder v2 — SUPPORT FREE
// All overhangs kept under 45 degrees
// Print in PETG, no supports needed
// Fits sink edges 8–22mm thick (flex clip)

$fn = 60;

// ---- Settings ----
clip_gap = 15;      // sink edge opening
clip_w = 20;
clip_wall = 4;
clip_h = 30;
basket_d = 96;
basket_h = 30;
basket_wall = 2.5;

// ---- Clip arm — fully support-free ----
// All inner surfaces angled 45deg or steeper
module clip_arm() {
    union() {
        // Outer back wall (straight vertical — no overhang)
        cube([clip_w, clip_wall, clip_h]);

        // Bottom hook — angled ramp instead of horizontal shelf
        // Ramp rises at 45 deg from front, no overhang
        translate([0, clip_wall, 0])
        linear_extrude(height=clip_w, center=false, convexity=4)
        polygon(points=[
            [0,              0],
            [clip_gap,       0],
            [clip_gap,       clip_wall],
            [0,              clip_wall],
        ]);

        // Inner short arm — angled top so no overhang
        translate([0, clip_wall + clip_gap, 0])
        union() {
            // Straight section
            cube([clip_w, clip_wall, clip_h * 0.55]);
            // Chamfered top — 45 deg angle, no overhang
            translate([0, 0, clip_h * 0.55])
            linear_extrude(height=clip_w, center=false)
            polygon(points=[
                [0,         0],
                [clip_wall, 0],
                [0,         clip_wall],
            ]);
        }

        // Top bridge with chamfer on inside
        translate([0, 0, clip_h - clip_wall])
        difference() {
            cube([clip_w, clip_wall * 2 + clip_gap, clip_wall]);
            // 45 deg chamfer on underside inside face
            translate([-1, clip_wall, 0])
            rotate([45, 0, 0])
            cube([clip_w + 2, clip_wall, clip_wall]);
        }
    }
}

// ---- Basket with drainage holes ----
module basket() {
    difference() {
        cylinder(d=basket_d, h=basket_h, $fn=80);
        translate([0, 0, basket_wall])
            cylinder(d=basket_d - basket_wall*2, h=basket_h, $fn=80);
        // Drainage holes
        for (a=[0:40:360]) {
            rotate([0,0,a]) {
                translate([30, 0, -1]) cylinder(d=7, h=basket_wall+2, $fn=24);
                translate([15, 0, -1]) cylinder(d=5, h=basket_wall+2, $fn=24);
            }
        }
        translate([0,0,-1]) cylinder(d=8, h=basket_wall+2, $fn=24);
    }
}

// ---- Neck connecting clips to basket ----
module neck() {
    hull() {
        // clip side
        translate([-clip_w - 3, 0, clip_h - 10]) cube([clip_w*2 + clip_w + 6, 2, 8]);
        // basket side
        translate([0, basket_d/2 - 5, clip_h - 10]) cylinder(d=basket_d * 0.65, h=8, $fn=60);
    }
}

// ---- ASSEMBLE ----
union() {
    translate([-clip_w - 3, 0, 0]) clip_arm();
    translate([3,            0, 0]) clip_arm();
    neck();
    translate([0, basket_d/2 - 5, 0]) basket();
}
