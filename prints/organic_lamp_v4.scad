// Organic Flowing Lamp v4
// Sculptural vase-body with organic cutout holes
// Light disc at top, curved base legs
// Fits LED Lamp Kit MH001 or E27 bulb

$fn = 120;

// ---- Outer shell via lathe profile ----
module shell_body() {
    rotate_extrude($fn=120)
    polygon(points=[
        [2,   0],
        [44,  0],
        [40,  8],
        [32,  25],
        [22,  50],   // narrow waist
        [20,  70],
        [30,  95],
        [42,  118],
        [44,  128],
        [44,  135],
        [2,   135]
    ]);
}

// ---- Inner hollow (shell wall ~3mm) ----
module shell_hollow() {
    rotate_extrude($fn=120)
    polygon(points=[
        [0,   3],
        [40,  3],
        [36,  10],
        [28,  27],
        [18,  51],
        [16,  71],
        [26,  96],
        [38,  119],
        [40,  129],
        [40,  136],
        [0,   136]
    ]);
}

// ---- Organic oval cutout hole ----
module oval_hole(rx, ry, rz) {
    scale([rx, ry, rz])
        sphere(d=1, $fn=60);
}

// ---- Big organic holes through the body ----
module cutouts() {
    // Front large hole - mid body
    translate([0, 26, 55])
        scale([14, 8, 22])
            sphere(d=1, $fn=60);

    // Back large hole - mid body offset
    rotate([0,0,180])
    translate([0, 26, 60])
        scale([12, 8, 20])
            sphere(d=1, $fn=60);

    // Left side hole - lower
    rotate([0,0,90])
    translate([0, 28, 30])
        scale([10, 7, 15])
            sphere(d=1, $fn=60);

    // Right side hole - upper
    rotate([0,0,270])
    translate([0, 27, 85])
        scale([10, 7, 14])
            sphere(d=1, $fn=60);

    // Front upper hole
    translate([0, 30, 100])
        scale([9, 6, 12])
            sphere(d=1, $fn=60);
}

// ---- Light disc top opening ----
module top_opening() {
    translate([0, 0, 128])
        cylinder(d=70, h=20, $fn=120);
}

// ---- LED base opening ----
module base_opening() {
    translate([0, 0, -1])
        cylinder(d=38, h=12, $fn=80);
    // cable slot
    translate([-4, -26, -1])
        cube([8, 10, 12]);
}

// ---- ASSEMBLE ----
difference() {
    shell_body();
    shell_hollow();
    cutouts();
    top_opening();
    base_opening();
}
