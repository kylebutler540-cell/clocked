// Alien Organic Lamp v3
// Thin-wall tube approach — smooth organic arms, no hollowing artifacts
// Fits LED Lamp Kit MH001 — LED sits in base, light glows up through arms
// Print: white/silk PLA, 2 walls, 0% infill, 0.2mm layers

$fn = 80;

// ---- Base ring — LED kit snaps inside ----
module base() {
    difference() {
        cylinder(d=56, h=12, $fn=80);
        translate([0,0,-1]) cylinder(d=42, h=14, $fn=80); // LED kit opening
        translate([-5, -32, -1]) cube([10, 14, 14]);       // cable slot
    }
}

// ---- Single smooth arm: thin organic tube sweeping outward then up ----
module arm(rot, reach, peak_h, tip_h, twist, d1, d2, d3) {
    rotate([0,0,rot])
    union() {
        // Main arm — 3 point sweep
        hull() {
            translate([7,  0,          14])  sphere(d=d1, $fn=40);
            translate([reach, twist*3, 42])  sphere(d=d2, $fn=40);
        }
        hull() {
            translate([reach, twist*3, 42])  sphere(d=d2, $fn=40);
            translate([reach*0.7, twist*7, peak_h]) sphere(d=d2*0.8, $fn=40);
        }
        hull() {
            translate([reach*0.7, twist*7, peak_h])  sphere(d=d2*0.8, $fn=40);
            translate([reach*0.3, twist*5, tip_h])   sphere(d=d3, $fn=40);
        }
        // Tip bud
        translate([reach*0.3, twist*5, tip_h]) sphere(d=d3*1.4, $fn=30);

        // Secondary smaller finger off mid-arm
        hull() {
            translate([reach*0.9, twist*2, 38])   sphere(d=d2*0.6, $fn=30);
            translate([reach*1.1, twist*6, 60])   sphere(d=d2*0.45, $fn=30);
            translate([reach*0.8, twist*9, 78])   sphere(d=d2*0.35, $fn=30);
        }
        translate([reach*0.8, twist*9, 78]) sphere(d=d2*0.55, $fn=24);
    }
}

// ---- Central thin spine for structural integrity + glow ----
module spine() {
    hull() {
        translate([0,0,10]) cylinder(d=18, h=2,  $fn=60);
        translate([0,0,55]) cylinder(d=10, h=2,  $fn=60);
        translate([0,0,90]) cylinder(d=6,  h=2,  $fn=60);
    }
    // Tip dome
    translate([0,0,94]) sphere(d=8, $fn=40);
}

// ---- Small organic nodules on the spine ----
module nodules() {
    for (a=[0:45:315]) {
        rotate([0,0,a]) {
            translate([8,  0, 22]) sphere(d=3.5, $fn=20);
            translate([6,  0, 42]) sphere(d=2.8, $fn=20);
            translate([4,  0, 62]) sphere(d=2.2, $fn=20);
            translate([3,  0, 78]) sphere(d=1.8, $fn=20);
        }
    }
}

// ---- MAIN ----
union() {
    base();
    spine();
    nodules();

    // 7 arms, organically varied
    arm(rot=0,   reach=30, peak_h=72, tip_h=95,  twist=-1, d1=6.5, d2=4.2, d3=2.8);
    arm(rot=51,  reach=27, peak_h=68, tip_h=90,  twist= 1, d1=6.0, d2=4.0, d3=2.6);
    arm(rot=103, reach=32, peak_h=75, tip_h=98,  twist=-1, d1=6.5, d2=4.4, d3=3.0);
    arm(rot=154, reach=26, peak_h=65, tip_h=88,  twist= 1, d1=5.8, d2=3.8, d3=2.5);
    arm(rot=205, reach=31, peak_h=74, tip_h=96,  twist=-1, d1=6.4, d2=4.2, d3=2.8);
    arm(rot=257, reach=25, peak_h=66, tip_h=87,  twist= 1, d1=5.6, d2=3.8, d3=2.4);
    arm(rot=308, reach=29, peak_h=70, tip_h=92,  twist=-1, d1=6.2, d2=4.0, d3=2.7);
}
