import "./Sketch.css";

// Hand-drawn monoline doodles. Decorative only: atmosphere, never content.
const paths = {
  arrow: {
    viewBox: "0 0 120 80",
    d: [
      "M6 14c18 2 40 8 56 22s26 30 40 34",
      "M86 58c6 5 12 9 18 12-7 1-14 0-20 3",
    ],
  },
  squiggle: {
    viewBox: "0 0 220 24",
    d: [
      "M4 16c14-10 24-10 34 0s22 10 34 0 22-10 34 0 22 10 34 0 22-10 34 0 18 8 26 2",
    ],
  },
  underline: {
    viewBox: "0 0 220 20",
    d: ["M4 13c50-6 120-9 210-5", "M30 17c40-3 90-4 150-2"],
  },
  circle: {
    viewBox: "0 0 240 110",
    d: [
      "M128 8C64 4 10 24 8 54s52 50 118 48 108-22 106-50S170 8 104 12c-20 1-38 5-52 11",
    ],
  },
  star: {
    viewBox: "0 0 60 60",
    d: ["M30 4l6 18 19 1-15 11 6 19-16-11-16 11 6-19L5 23l19-1z"],
  },
  // Cartez's sign-off: five letter strokes and an underline swash, drawn in order.
  signature: {
    viewBox: "0 0 220 70",
    d: [
      "M40 18c-6-7-22-6-29 6-8 14 0 28 15 26 7-1 12-5 15-9",
      "M58 32c-4-4-12-2-13 5-1 6 5 8 9 3 2-3 4-7 4-8 0 4-1 9 3 9 3 0 5-4 7-8",
      "M67 33c2-2 4-3 6-2 1 1 0 4-1 6l-1 8c1-6 5-12 10-13",
      "M88 14c-2 10-4 22-3 30 1 3 4 3 7 0",
      "M80 26h14",
      "M98 39c4 0 9-3 9-7 0-3-4-3-6 0-3 4-2 11 3 12 4 1 8-3 10-6",
      "M114 32c3-2 9-3 11-1-3 4-8 9-10 13 4-2 9-2 12 1 2 2-1 8-6 12-4 3-9 4-11 2",
      "M22 64c40 3 92 1 152-7 10-1 18-3 26-6",
    ],
  },
  spark: {
    viewBox: "0 0 60 60",
    d: [
      "M30 6v14",
      "M30 40v14",
      "M6 30h14",
      "M40 30h14",
      "M14 14l8 8",
      "M38 38l8 8",
      "M46 14l-8 8",
      "M22 38l-8 8",
    ],
  },
};

export default function Sketch({ variant, className = "", ...props }) {
  const shape = paths[variant];
  return (
    <svg
      className={`sketch sketch--${variant} ${className}`.trim()}
      viewBox={shape.viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {shape.d.map((d) => (
        <path key={d} d={d} pathLength="1" />
      ))}
    </svg>
  );
}
