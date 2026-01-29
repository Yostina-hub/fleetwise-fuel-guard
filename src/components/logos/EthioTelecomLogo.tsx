const EthioTelecomLogo = ({ className = "h-12" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 220 55" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wave/Swirl Icon */}
      <g transform="translate(2, 5)">
        {/* Outer blue C-shape arc */}
        <path 
          d="M22 3 C38 3, 48 15, 48 27 C48 39, 38 50, 22 50 C10 50, 2 42, 0 32"
          fill="none"
          stroke="#0072BC"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Inner teal/green swirl - the wave inside */}
        <ellipse cx="24" cy="27" rx="14" ry="16" fill="#00A693" />
        <path 
          d="M14 18 Q28 10, 36 22 Q40 32, 32 38 Q24 44, 16 38 Q10 32, 14 24"
          fill="#8DC63F"
        />
      </g>
      
      {/* "ethio telecom" text - WHITE */}
      <text 
        x="58" 
        y="28" 
        fontFamily="Arial, sans-serif" 
        fontSize="18" 
        fontWeight="bold"
        fill="white"
      >
        ethio telecom
      </text>
      
      {/* Amharic text - Orange color */}
      <text 
        x="58" 
        y="44" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="11"
        fill="#F7941D"
      >
        ኢትዮ ቴሌኮም
      </text>
      
      {/* TM symbol */}
      <text 
        x="196" 
        y="22" 
        fontFamily="Arial, sans-serif" 
        fontSize="7"
        fill="rgba(255,255,255,0.7)"
      >
        ™
      </text>
    </svg>
  );
};

export default EthioTelecomLogo;
