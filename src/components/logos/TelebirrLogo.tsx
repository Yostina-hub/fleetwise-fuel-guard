const TelebirrLogo = ({ className = "h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 120 45" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cross/Plus icon - Light blue */}
      <g transform="translate(0, 4)">
        {/* Vertical bar */}
        <rect x="14" y="0" width="6" height="36" rx="1" fill="#00A3D9" />
        {/* Horizontal bar */}
        <rect x="0" y="10" width="34" height="6" rx="1" fill="#0087B8" />
        {/* Center highlight */}
        <rect x="14" y="10" width="6" height="6" fill="#00B8E0" />
      </g>
      
      {/* Amharic text "ቴሌብር" - Yellow/Gold color */}
      <text 
        x="42" 
        y="16" 
        fontFamily="'Noto Sans Ethiopic', Arial, sans-serif" 
        fontSize="12"
        fill="#F7C41F"
      >
        ቴሌብር
      </text>
      
      {/* "telebirr" text - Light blue */}
      <text 
        x="42" 
        y="34" 
        fontFamily="Arial, sans-serif" 
        fontSize="16" 
        fontWeight="bold"
        fill="#00A3D9"
      >
        telebirr
      </text>
    </svg>
  );
};

export default TelebirrLogo;
