// =============================================
// Custom Chip Clip — Prototype v1
// Track-mount design with cylinder posts
// =============================================
// PRINT 2 COPIES — assemble with a spring pin
// All dimensions in cm
//
// Measurements:
//   Clip total height:   8.5cm
//   Body width (max):    8.0cm
//   Handle width:        2.5cm
//   Arm depth:           3.0cm
//   Cylinder diameter:   1.0cm
//   Cylinder length:     1.8cm (estimated — adjust to match your track)
//   Pivot from bottom:   4.75cm
// =============================================

$fn = 48;

// === DIMENSIONS (cm) — scaled down 3.45% from OXO reference ===
CH    = 8.21;  // clip height, handle top to grip tip
BW    = 7.72;  // max body width
HW    = 2.41;  // handle width
AD    = 2.90;  // arm depth (front to back)
WT    = 0.3;   // wall thickness (hollow shell)

CYL_D = 0.97;  // cylinder diameter
CYL_L = 1.74;  // cylinder length (how far it inserts into track)
PIN_D = 0.45;  // spring pin hole diameter
PIN_Y = CH - 4.59;  // pivot location — 4.59cm from bottom tip (scaled)

// Grip serrations at tip
N_SERR     = 9;
SERR_PITCH = 0.28;

// Spine ridges (structural + aesthetic)
N_SPINE    = 5;

// === 2D ARM PROFILE (viewed from front) ===
module arm_2d() {
    hull() {
        square([HW,   0.4], center=true);                         // narrow top
        translate([0, CH*0.38]) square([BW,   0.4], center=true); // wide middle
        translate([0, CH])      square([BW*0.58, 0.4], center=true); // tapered tip
    }
}

// === SINGLE ARM ===
module arm() {
    difference() {
        union() {
            // Main hollow arm body
            difference() {
                // Outer shell
                linear_extrude(AD, center=true)
                    offset(r=0.4) offset(r=-0.4)
                    arm_2d();
                
                // Hollow interior
                translate([0, 0, 0])
                    linear_extrude(AD - WT*2, center=true)
                    offset(r=0.4) offset(r=-0.4)
                    offset(delta=-WT)
                    arm_2d();
            }
            
            // === TRACK MOUNT CYLINDER ===
            // Sits on top of handle, points upward
            // Slides into matching hole in underside track
            translate([0, 0, AD/2])
                cylinder(d=CYL_D, h=CYL_L);
        }
        
        // Spring pivot pin hole
        translate([0, PIN_Y, 0])
            cylinder(d=PIN_D, h=AD+0.2, center=true);
    }
    
    // === GRIP SERRATIONS (at tip) ===
    for(i = [0 : N_SERR-1]) {
        translate([0, CH - i*SERR_PITCH - 0.1, AD/2])
            cube([BW*0.58, 0.1, 0.09], center=true);
    }
    
    // === SPINE RIDGES (outer edge, structural) ===
    for(i = [0 : N_SPINE-1]) {
        ry = CH*0.2 + i*(CH*0.45/N_SPINE);
        for(side=[-1,1]) {
            translate([side*(BW*0.42), ry, 0])
                cube([0.2, 0.3, AD+0.1], center=true);
        }
    }
}

// === RENDER ===
// Renders ONE arm — print 2 copies
arm();

// --- PREVIEW ASSEMBLY ---
// Uncomment the lines below to preview both arms together:
// arm();
// translate([0, 0, AD + 0.15]) mirror([0,0,1]) arm();
