// Phone Stand - Test Print
// Designed for Bambu P1S with PLA

// --- Settings ---
base_width = 90;
base_depth = 60;
base_height = 4;

back_height = 80;
back_thickness = 5;
back_angle = 15; // degrees tilted back

groove_width = 16; // iPhone 16 Pro Max with case
groove_depth = 3;
groove_pos = 18; // from front

corner_radius = 5;

// --- Base ---
module rounded_box(w, d, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h, $fn=40);
        translate([w-r, r, 0]) cylinder(r=r, h=h, $fn=40);
        translate([r, d-r, 0]) cylinder(r=r, h=h, $fn=40);
        translate([w-r, d-r, 0]) cylinder(r=r, h=h, $fn=40);
    }
}

// Base plate
rounded_box(base_width, base_depth, base_height, corner_radius);

// Back support (angled)
translate([0, base_depth - back_thickness, base_height])
rotate([-back_angle, 0, 0])
    cube([base_width, back_thickness, back_height]);

// Phone groove (slot to hold phone)
translate([(base_width - groove_width) / 2, 0, base_height - groove_depth])
    cube([groove_width, groove_pos + 5, groove_depth + 1]);

// --- Name on base ---
translate([base_width / 2, base_depth / 2 - 5, base_height])
    linear_extrude(height = 2)
        text("LUKAS", size = 10, font = "Liberation Sans:style=Bold",
             halign = "center", valign = "center");
