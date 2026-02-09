import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  adminGetProducts,
  adminGetCategories,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  uploadImageToImgBB,
} from '../api';

function buildCategoryTree(flat) {
  if (!flat?.length) return [];
  const byId = {};
  flat.forEach((c) => { byId[c.id] = { ...c, children: [] }; });
  const roots = [];
  flat.forEach((c) => {
    const node = byId[c.id];
    if (!c.parent_id) roots.push(node);
    else if (byId[c.parent_id]) byId[c.parent_id].children.push(node);
    else roots.push(node);
  });
  return roots;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    brand: '',
    image: '',
    attributesList: [{ key: '', value: '' }],
  });
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', parent_id: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const navigate = useNavigate();

  const categoriesTree = buildCategoryTree(categories);

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
  const loadCategories = () => adminGetCategories().then(setCategories);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      category_id: categories[0]?.id || '',
      brand: '',
      image: '',
      attributesList: [{ key: '', value: '' }],
    });
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setFormOpen(true);
    const att = p.attributes && typeof p.attributes === 'object' ? p.attributes : {};
    const attributesList = Object.keys(att).length
      ? Object.entries(att).map(([key, value]) => ({ key, value: String(value) }))
      : [{ key: '', value: '' }];
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      category_id: p.category_id || '',
      brand: p.brand || '',
      image: p.image || '',
      attributesList,
    });
  };

  const addAttributeRow = () => setForm((f) => ({ ...f, attributesList: [...f.attributesList, { key: '', value: '' }] }));
  const removeAttributeRow = (i) =>
    setForm((f) => ({
      ...f,
      attributesList: f.attributesList.filter((_, idx) => idx !== i),
    }));
  const updateAttributeRow = (i, field, val) =>
    setForm((f) => ({
      ...f,
      attributesList: f.attributesList.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)),
    }));

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setError(err.message || 'خطا در آپلود تصویر');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (categories.length > 0 && !form.category_id) {
      setError('لطفاً یک دسته‌بندی انتخاب کنید.');
      return;
    }
    const attributes = {};
    form.attributesList.forEach((row) => {
      const k = String(row.key || '').trim();
      if (k) attributes[k] = String(row.value || '').trim();
    });
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price', form.price);
    fd.append('stock', form.stock);
    fd.append('category_id', form.category_id);
    fd.append('brand', form.brand);
    fd.append('attributes', JSON.stringify(attributes));
    if (form.image) fd.append('image', form.image);
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

  const openCategoryCreate = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', slug: '', parent_id: '' });
    setCategoryFormOpen(true);
  };
  const openCategoryEdit = (c) => {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, slug: c.slug || '', parent_id: c.parent_id || '' });
    setCategoryFormOpen(true);
  };
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { name: categoryForm.name.trim(), slug: categoryForm.slug.trim() || undefined, parent_id: categoryForm.parent_id || null };
      if (editingCategoryId) {
        await adminUpdateCategory(editingCategoryId, payload);
      } else {
        await adminCreateCategory(payload);
      }
      setCategoryFormOpen(false);
      loadCategories();
    } catch (err) {
      setError(err.message || 'خطا');
    }
  };
  const handleCategoryDelete = async (id) => {
    if (!confirm('حذف این دسته؟')) return;
    try {
      await adminDeleteCategory(id);
      loadCategories();
      if (editingCategoryId === id) setCategoryFormOpen(false);
      setError('');
    } catch (err) {
      setError(err.message || 'خطا در حذف');
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
        <h1 className="page-title">پنل مدیریت</h1>
        <button type="button" className="btn btn-ghost" onClick={logout}>خروج</button>
      </div>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <a href="#" role="button" className={tab === 'products' ? 'active' : ''} style={{ display: 'block' }} onClick={(e) => { e.preventDefault(); setTab('products'); }}>محصولات</a>
          <a href="#" role="button" className={tab === 'categories' ? 'active' : ''} style={{ display: 'block' }} onClick={(e) => { e.preventDefault(); setTab('categories'); }}>دسته‌بندی‌ها</a>
          <NavLink to="/">بازگشت به فروشگاه</NavLink>
        </aside>
        <div className="admin-content">
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

          {tab === 'products' && (
            <>
              {formOpen ? (
                <form className="admin-form" onSubmit={handleSubmit}>
                  <h3>{editing ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
                  <label>نام</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  <label>توضیحات</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  <label>قیمت</label>
                  <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
                  <label>موجودی</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                  <label>دسته‌بندی / زیردسته</label>
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">انتخاب کنید</option>
                    {categoriesTree.map((root) => (
                      <optgroup key={root.id} label={root.name}>
                        <option value={root.id}>{root.name} (دسته اصلی)</option>
                        {root.children.map((child) => (
                          <option key={child.id} value={child.id}>— {child.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <label>برند</label>
                  <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                  <label>ویژگی‌ها</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {form.attributesList.map((row, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input placeholder="نام ویژگی (مثلاً رنگ)" value={row.key} onChange={(e) => updateAttributeRow(i, 'key', e.target.value)} style={{ flex: 1 }} />
                        <input placeholder="مقدار (مثلاً نقره‌ای)" value={row.value} onChange={(e) => updateAttributeRow(i, 'value', e.target.value)} style={{ flex: 1 }} />
                        <button type="button" className="btn btn-ghost" onClick={() => removeAttributeRow(i)}>حذف</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost" onClick={addAttributeRow}>+ افزودن ویژگی</button>
                  </div>
                  <label>تصویر (آپلود به ImgBB یا URL)</label>
                  <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploadingImage} />
                  {uploadingImage && <span style={{ marginRight: '0.5rem', color: 'var(--muted)' }}>در حال آپلود…</span>}
                  {form.image && <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="URL تصویر" style={{ marginTop: '0.25rem', width: '100%' }} />}
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
                  {products.map((p) => (
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
            </>
          )}

          {tab === 'categories' && (
            <>
              {categoryFormOpen ? (
                <form className="admin-form" onSubmit={handleCategorySubmit}>
                  <h3>{editingCategoryId ? 'ویرایش دسته' : 'افزودن دسته / زیردسته'}</h3>
                  <label>نام دسته</label>
                  <input value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً لباس یا مردانه" required />
                  <label>زیردستهٔ (والد)</label>
                  <select value={categoryForm.parent_id} onChange={(e) => setCategoryForm((f) => ({ ...f, parent_id: e.target.value }))}>
                    <option value="">بدون والد (دسته اصلی)</option>
                    {categories.filter((c) => !c.parent_id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label>slug (اختیاری)</label>
                  <input value={categoryForm.slug} onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))} placeholder="مثلاً mens" />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn">ذخیره</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setCategoryFormOpen(false)}>انصراف</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn" onClick={openCategoryCreate} style={{ marginBottom: '1rem' }}>+ افزودن دسته / زیردسته</button>
              )}
              <h3 style={{ marginTop: '1.5rem' }}>لیست دسته‌بندی‌ها</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {categoriesTree.map((root) => (
                  <li key={root.id} style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{root.name}</span>
                    <button type="button" className="btn-ghost" style={{ marginRight: '0.5rem' }} onClick={() => openCategoryEdit(root)}>ویرایش</button>
                    <button type="button" className="btn-ghost btn-danger" onClick={() => handleCategoryDelete(root.id)}>حذف</button>
                    {root.children?.length > 0 && (
                      <ul style={{ listStyle: 'none', paddingRight: '1.5rem', marginTop: '0.25rem' }}>
                        {root.children.map((child) => (
                          <li key={child.id}>
                            — {child.name}
                            <button type="button" className="btn-ghost" style={{ marginRight: '0.5rem' }} onClick={() => openCategoryEdit(child)}>ویرایش</button>
                            <button type="button" className="btn-ghost btn-danger" onClick={() => handleCategoryDelete(child.id)}>حذف</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
