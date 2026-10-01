/*
 * Map callouts, positioned as a fraction (0..1) of the radar image.
 * color: optional text color. vertical: optional, writes the label top to bottom.
 * size: "lg" for sites/spawns, "md" for major areas, "sm" for small spots.
 */
export const callouts = {
  de_mirage: [
    { name: "Tapete", x: 0.311, y: 0.178, size: "md" },
    { name: "B", x: 0.228, y: 0.276, size: "lg" },
    { name: "L", x: 0.47, y: 0.344, size: "lg" },
    { name: "TR", x: 0.875, y: 0.354, size: "lg" },
    { name: "Mercado", x: 0.228, y: 0.44, size: "md" },
    { name: "Janelão", x: 0.387, y: 0.444, size: "sm" },
    { name: "Meio", x: 0.5625, y: 0.441, size: "md" },
    { name: "Caixote", x: 0.746, y: 0.455, size: "sm" },
    { name: "Ligação", x: 0.5, y: 0.522, size: "sm" },
    { name: "Jungle", x: 0.396, y: 0.582, size: "sm" },
    { name: "Caverna", x: 0.7, y: 0.633, size: "md" },
    { name: "Palácio", x: 0.746, y: 0.73, size: "md" },
    { name: "A", x: 0.541, y: 0.761, size: "lg" },
    { name: "CT", x: 0.38, y: 0.8, size: "lg" },
  ],
  de_dust2: [
    { name: "B", x: 0.208, y: 0.134, size: "lg", color: "#fbbf24" },
    { name: "A", x: 0.801, y: 0.168, size: "lg", color: "#fbbf24" },
    { name: "CT", x: 0.53, y: 0.241, size: "md" },
    { name: "Varanda", x: 0.631, y: 0.226, size: "md", vertical: true },
    { name: "CT", x: 0.698, y: 0.226, size: "md" },
    { name: "Escuro baixo", x: 0.357, y: 0.398, size: "sm" },
    { name: "Varanda", x: 0.549, y: 0.438, size: "md" },
    { name: "Escuro alto", x: 0.209, y: 0.464, size: "md" },
    { name: "Meio", x: 0.459, y: 0.499, size: "md" },
    { name: "Fundo", x: 0.693, y: 0.513, size: "md" },
    { name: "Rampa", x: 0.865, y: 0.583, size: "md" },
    { name: "TR", x: 0.386, y: 0.911, size: "lg" },
  ],
};
