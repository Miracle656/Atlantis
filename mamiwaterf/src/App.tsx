import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DAppDetailPage from './pages/DAppDetailPage';
import RankingsPage from './pages/RankingsPage';
import SubmitPage from './pages/SubmitPage';
import AirdropsPage from './pages/AirdropsPage';
import WrappedPage from './pages/WrappedPage';
import DiscussionsPage from './pages/DiscussionsPage';
import ProfilePage from './pages/ProfilePage';
import UpdatesPage from './pages/UpdatesPage';

import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="dapp/:id" element={<DAppDetailPage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="updates" element={<UpdatesPage />} />
          <Route path="airdrops" element={<AirdropsPage />} />
          <Route path="discussions" element={<DiscussionsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="/wrapped" element={<WrappedPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
