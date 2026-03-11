"use client";

interface CafeAwningProps {
  size?: "full" | "small";
  tagline?: string;
}

export default function CafeAwning({
  size = "full",
  tagline = "more than just a pattern finder.",
}: CafeAwningProps) {
  const stripeHeight = size === "full" ? "h-[38vh]" : "h-[18vh]";
  const titleSize = size === "full" ? "text-5xl sm:text-8xl" : "text-2xl sm:text-4xl";
  const showTagline = size === "full";

  return (
    <div className="w-full relative">
      {/* Striped awning body */}
      <div
        className={`w-full ${stripeHeight} relative`}
        style={{
          background:
            "repeating-linear-gradient(90deg, #c6dbe4 0px, #c6dbe4 60px, #FEFEF0 60px, #FEFEF0 120px)",
        }}
      >
        {/* Centered branding inside stripe area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4">
          <h1
            className={`${titleSize} text-[#673F27] drop-shadow-sm`}
            style={{ fontFamily: "Pacifico, cursive" }}
          >
            coffee.
          </h1>
          {showTagline && (
            <p
              className="text-[#673F27]/80 text-sm tracking-wide"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {tagline}
            </p>
          )}
        </div>
      </div>

      {/* Scallop / wavy bottom edge */}
      <div className="w-full overflow-hidden" style={{ marginTop: "-2px" }}>
        <svg
          viewBox="0 0 1440 60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full"
          style={{ display: "block", height: "60px" }}
        >
          {/* Brown shadow layer slightly below */}
          <path
            d="M0,0 C60,40 120,40 180,0 C240,40 300,40 360,0 C420,40 480,40 540,0 C600,40 660,40 720,0 C780,40 840,40 900,0 C960,40 1020,40 1080,0 C1140,40 1200,40 1260,0 C1320,40 1380,40 1440,0 L1440,60 L0,60 Z"
            fill="#B0A89A"
            transform="translate(0, 6)"
          />
          {/* Main scallop in stripe pattern color — cuts the awning bottom */}
          <path
            d="M0,0 C60,40 120,40 180,0 C240,40 300,40 360,0 C420,40 480,40 540,0 C600,40 660,40 720,0 C780,40 840,40 900,0 C960,40 1020,40 1080,0 C1140,40 1200,40 1260,0 C1320,40 1380,40 1440,0 L1440,60 L0,60 Z"
            fill="#FEFEF0"
          />
        </svg>
      </div>
    </div>
  );
}
