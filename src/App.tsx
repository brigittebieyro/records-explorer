import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './Header/Header';
import Info from './Info/Info';
import LocalMeets from './LocalMeets/LocalMeets';
import RecordViewer from './RecordViewer/RecordViewer';
import Scripts from './Scripts/Scripts';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<RecordViewer />} />
        <Route path="/info" element={<Info />} />
        <Route path="/local-meet-results" element={<LocalMeets />} />
        <Route path="/scripts" element={<Scripts />} />
      </Routes>
    </BrowserRouter>
  );
}
