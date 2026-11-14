import './App.css';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { wsoDisplayName } from './Data/RoutesAndSettings';
import Header from './Header/Header';
import Info from './Info/Info';
import LocalMeets from './LocalMeets/LocalMeets';
import AdaptiveRecords from './RecordViewer/AdaptiveRecords';
import RecordViewer from './RecordViewer/RecordViewer';
import Goals from './Goals/Goals';
import Scripts from './Scripts/Scripts';

export default function App() {
  useEffect(() => {
    document.title = `${wsoDisplayName} Records & Results Explorer`;
  }, []);

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<RecordViewer />} />
        <Route path="/adaptive" element={<AdaptiveRecords />} />
        <Route path="/info" element={<Info />} />
        <Route path="/local-meet-results" element={<LocalMeets />} />
        <Route path="/scripts" element={<Scripts />} />
        <Route path="/goals" element={<Goals />} />
      </Routes>
    </BrowserRouter>
  );
}
