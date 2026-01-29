const EthioTelecomLogo = ({ className = "h-12" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 280 80" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wave/Swirl Icon */}
      <g transform="translate(0, 5)">
        {/* Outer blue arc */}
        <path 
          d="M35 10 C55 10, 65 25, 65 40 C65 55, 55 70, 35 70 C20 70, 8 58, 5 45"
          fill="none"
          stroke="#0072BC"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Inner green swirl */}
        <path 
          d="M25 25 C40 20, 50 30, 48 42 C46 52, 35 55, 25 50 C18 46, 20 35, 28 32"
          fill="#8DC63F"
        />
        <ellipse cx="32" cy="38" rx="8" ry="10" fill="#8DC63F" />
      </g>
      
      {/* "ethio telecom" text - WHITE for dark backgrounds */}
      <text 
        x="80" 
        y="38" 
        fontFamily="Arial, sans-serif" 
        fontSize="24" 
        fontWeight="bold"
        fill="white"
      >
        ethio telecom
      </text>
      
      {/* Amharic text */}
      <text 
        x="80" 
        y="58" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="14"
        fill="rgba(255,255,255,0.7)"
      >
        ኢትዮ ቴሌኮም
      </text>
      
      {/* TM symbol */}
      <text 
        x="248" 
        y="30" 
        fontFamily="Arial, sans-serif" 
        fontSize="10"
        fill="rgba(255,255,255,0.6)"
      >
        ™
      </text>
    </svg>
  );
};

export default EthioTelecomLogo;
