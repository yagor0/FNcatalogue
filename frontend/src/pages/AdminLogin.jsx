import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { adminLogin } from '../api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  if (token) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token: t } = await adminLogin(username, password);
      localStorage.setItem('admin_token', t);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'ورود ناموفق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h1 className="page-title">ورود به پنل مدیریت</h1>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>نام کاربری</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>{loading ? 'در حال ورود...' : 'ورود'}</button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>برای تست: admin / admin123</p>
    </div>
  );
}
