const TelebirrLogo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 140 55" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cross/Plus icon - Light blue/cyan */}
      <g transform="translate(0, 5)">
        {/* Vertical bar */}
        <rect x="16" y="0" width="7" height="40" rx="1.5" fill="#00BCD4" />
        {/* Horizontal bar */}
        <rect x="0" y="12" width="40" height="7" rx="1.5" fill="#0097A7" />
        {/* Center overlap highlight */}
        <rect x="16" y="12" width="7" height="7" fill="#00D4E8" />
      </g>
      
      {/* Amharic text "ቴሌብር" - positioned above telebirr */}
      <text 
        x="48" 
        y="18" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="13"
        fill="#00BCD4"
      >
        ቴሌብር
      </text>
      
      {/* "telebirr" text - Light blue/cyan */}
      <text 
        x="48" 
        y="40" 
        fontFamily="Arial, sans-serif" 
        fontSize="20" 
        fontWeight="bold"
        fill="#00BCD4"
      >
        telebirr
      </text>
    </svg>
  );
};

export default TelebirrLogo;
