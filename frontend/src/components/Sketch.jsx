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
