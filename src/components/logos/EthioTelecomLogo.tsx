const EthioTelecomLogo = ({ className = "h-12" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 260 70" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wave/Swirl Icon - Blue circular shape with inner curve */}
      <g transform="translate(5, 8)">
        {/* Outer blue C-shape */}
        <path 
          d="M28 5 C45 5, 55 18, 55 32 C55 46, 45 58, 28 58 C14 58, 4 48, 2 35"
          fill="none"
          stroke="#0072BC"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Inner green/teal swirl shape */}
        <path 
          d="M22 20 C35 16, 42 26, 40 36 C38 44, 30 48, 22 44 C16 40, 16 30, 24 26"
          fill="#00A99D"
        />
        <ellipse cx="28" cy="32" rx="7" ry="9" fill="#00A99D" />
      </g>
      
      {/* "ethio telecom" text - WHITE */}
      <text 
        x="70" 
        y="32" 
        fontFamily="Arial, sans-serif" 
        fontSize="22" 
        fontWeight="bold"
        fill="white"
      >
        ethio telecom
      </text>
      
      {/* Amharic text - Orange/Yellow color like in reference */}
      <text 
        x="70" 
        y="50" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="12"
        fill="#F7941D"
      >
        ኢትዮ ቴሌኮም
      </text>
      
      {/* TM symbol */}
      <text 
        x="232" 
        y="26" 
        fontFamily="Arial, sans-serif" 
        fontSize="8"
        fill="rgba(255,255,255,0.7)"
      >
        ™
      </text>
    </svg>
  );
};

export default EthioTelecomLogo;
