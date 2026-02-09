import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { adminGetProducts, adminGetCategories, adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '../api';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category_id: '', brand: '', image: '', attributes: '{}' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin');
      return;
    }
    Promise.all([adminGetProducts(), adminGetCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const loadProducts = () => adminGetProducts().then(setProducts);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({ name: '', description: '', price: '', stock: '', category_id: categories[0]?.id || '', brand: '', image: '', attributes: '{}' });
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setFormOpen(true);
    const attrs = typeof p.attributes === 'string' ? p.attributes : JSON.stringify(p.attributes || {});
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      category_id: p.category_id,
      brand: p.brand || '',
      image: p.image || '',
      attributes: attrs,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price', form.price);
    fd.append('stock', form.stock);
    fd.append('category_id', form.category_id);
    fd.append('brand', form.brand);
    fd.append('attributes', form.attributes);
    if (form.imageFile) fd.append('image', form.imageFile);
    else if (form.image) fd.append('image', form.image);
    try {
      if (editing) {
        await adminUpdateProduct(editing, fd);
        setEditing(null);
      } else {
        await adminCreateProduct(fd);
      }
      setFormOpen(false);
      loadProducts();
    } catch (err) {
      setError(err.message || 'خطا');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف این محصول؟')) return;
    try {
      await adminDeleteProduct(id);
      loadProducts();
      if (editing === id) setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  if (loading) return <p className="empty-state">در حال بارگذاری...</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title">پنل مدیریت محصولات</h1>
        <button type="button" className="btn btn-ghost" onClick={logout}>خروج</button>
      </div>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <NavLink to="/admin/dashboard" end className="active">محصولات</NavLink>
          <NavLink to="/">بازگشت به فروشگاه</NavLink>
        </aside>
        <div className="admin-content">
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
          {formOpen ? (
            <form className="admin-form" onSubmit={handleSubmit}>
              <h3>{editing ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
              <label>نام</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label>توضیحات</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              <label>قیمت</label>
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
              <label>موجودی</label>
              <input type="number" value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} />
              <label>دسته‌بندی</label>
              <select value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label>برند</label>
              <input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} />
              <label>ویژگی‌ها (JSON)</label>
              <input value={form.attributes} onChange={(e) => setForm(f => ({ ...f, attributes: e.target.value }))} placeholder='{"رنگ":"قرمز","سایز":"M"}' />
              <label>تصویر (فایل یا URL)</label>
              <input type="file" accept="image/*" onChange={(e) => setForm(f => ({ ...f, imageFile: e.target.files?.[0] }))} />
              {form.image && !form.imageFile && <input value={form.image} onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))} placeholder="URL تصویر" />}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn">ذخیره</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setFormOpen(false); }}>انصراف</button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn" onClick={openCreate} style={{ marginBottom: '1rem' }}>+ افزودن محصول</button>
          )}
          <h3 style={{ marginTop: '1.5rem' }}>لیست محصولات</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>قیمت</th>
                <th>موجودی</th>
                <th>دسته</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{new Intl.NumberFormat('fa-IR').format(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.category_name}</td>
                  <td>
                    <button type="button" className="btn-ghost" onClick={() => openEdit(p)}>ویرایش</button>
                    <button type="button" className="btn-ghost btn-danger" onClick={() => handleDelete(p.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
