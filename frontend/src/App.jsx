import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Wishlist from './pages/Wishlist';
import History from './pages/History';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="app-header">
          <div className="container">
            <NavLink to="/" className="logo">کاتالوگ الکترونیک</NavLink>
            <nav className="nav-links">
              <NavLink to="/">محصولات</NavLink>
              <NavLink to="/wishlist">لیست علاقه‌مندی</NavLink>
              <NavLink to="/history">تاریخچه مشاهده</NavLink>
              <NavLink to="/admin">مدیریت</NavLink>
            </nav>
          </div>
        </header>
        <main className="main-content">
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/history" element={<History />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
