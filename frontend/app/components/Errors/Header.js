import React from 'react';
function Header({ text, count }) {
  return (
    <h3 className="text-2xl capitalize">
      <span>{ text }</span>
      { count != null && <span className="ml-2 font-normal color-gray-medium">{ count }</span> }
    </h3>
	);
}

Header.displayName = "Header";

export default Header;
	   