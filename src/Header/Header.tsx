import { useState } from 'react';
import { localHomeUrl, localScheduleUrl, wsoName } from '../Data/RoutesAndSettings';

function Header() {
  const [menuVisible, setMenuVisible] = useState(false);

  const getMenuStyles = (): string => {
    let styles = 'menu-flyout';
    if (!menuVisible) {
      styles += ' hidden';
    }
    return styles;
  };

  const toggleMenu = (): void => {
    setMenuVisible(!menuVisible);
  };

  return (
    <div>
      <div className="App">
        <header className="App-header">
          <img className="header-logo" src="/WSOLogo.png" width="150" height="150" alt="WSO logo" />
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
                  <a href="/local-meet-results">Local Meet Results</a>
                </li>
                {/* <li>
                  <a href="/scripts">Scripts</a>
                </li> */}
                <li>
                  <a href={localScheduleUrl}>Local Meet Schedule</a>
                </li>
                <li>
                  <a href={localHomeUrl}>Official WSO Site</a>
                </li>
                <li>
                  <a href="/info">About</a>
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
