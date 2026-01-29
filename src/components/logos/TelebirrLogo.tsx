const TelebirrLogo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 180 60" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cross/Plus icon - Cyan/Blue only, no green */}
      <g transform="translate(5, 8)">
        {/* Vertical bar */}
        <rect x="18" y="0" width="8" height="44" rx="2" fill="#00BCD4" />
        {/* Horizontal bar */}
        <rect x="0" y="12" width="44" height="8" rx="2" fill="#0097A7" />
        {/* Center overlap highlight */}
        <rect x="18" y="12" width="8" height="8" fill="#00ACC1" />
      </g>
      
      {/* Amharic text "ቴሌብር" */}
      <text 
        x="58" 
        y="22" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="14"
        fill="rgba(255,255,255,0.8)"
      >
        ቴሌብር
      </text>
      
      {/* "telebirr" text - Cyan color */}
      <text 
        x="58" 
        y="45" 
        fontFamily="Arial, sans-serif" 
        fontSize="22" 
        fontWeight="bold"
        fill="#00BCD4"
      >
        telebirr
      </text>
    </svg>
  );
};

export default TelebirrLogo;
