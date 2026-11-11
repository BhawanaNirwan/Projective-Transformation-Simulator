# Projective Transformation Simulator

## Requirements
- Node.js (LTS recommended)
- npm

## Run on Windows
1. Extract this ZIP file.
2. Open the extracted `simulator_projective` folder.
3. Click the folder address bar, type `cmd`, and press Enter.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL printed by Vite (usually http://localhost:5173).

## Features
- Edit 3–8 input vertices using sliders or numeric fields.
- Visualize the original and projectively transformed polygon.
- Adjust translation, rotation, scale, and perspective parameters.
- View the 3×3 homography matrix and transformed coordinates.
- Drag the canvas to pan and scroll to zoom.

## Transformation
The simulator uses homogeneous coordinates:

x' = (a*x + b*y + c) / (g*x + h*y + 1)
y' = (d*x + e*y + f) / (g*x + h*y + 1)

The matrix is normalized so its bottom-right element is 1.
