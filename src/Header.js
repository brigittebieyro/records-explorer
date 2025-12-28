import { useState } from "react";
import { wsoName } from "./RoutesAndSettings";

function Header() {
  const [menuVisible, setMenuVisible] = useState(false);

  const getMenuStyles = () => {
    let styles = "menu-flyout";
    if (!menuVisible) {
      styles += " hidden";
    }
    return styles;
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <div>
      <div className="App">
        <header className="App-header">
          <img
            className="header-logo"
            src="/WSOLogo.png"
            width="150"
            height="150"
          />
          {wsoName} WSO Records Explorer
        </header>

        <div className="menu-container">
          <div className="menu-icon" onClick={toggleMenu}>
            <div className={getMenuStyles()}>
              <ul>
                <li>
                  <a href="/">WSO Records Explorer</a>
                </li>
                <li>
                  <a href="#">Nav Button - Info on how records work</a>
                </li>
                <li>
                  <a href="https://www.pacificweightliftingassociation.org/meet-schedule">
                    Local Meet Schedule
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
