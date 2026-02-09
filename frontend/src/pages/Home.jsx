import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts, getRecommended } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');

  useEffect(() => {
    getCategories(true).then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort, order };
    if (q) params.q = q;
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    setSearchParams(params, { replace: true });
    getProducts(params)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, category, brand, minPrice, maxPrice, sort, order]);

  useEffect(() => {
    getRecommended(6).then(setRecommended).catch(console.error);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (q) p.set('q', q); else p.delete('q');
      return p;
    }, { replace: true });
    setLoading(true);
    getProducts({ q, category, brand, minPrice, maxPrice, sort, order })
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  const renderCategoryTree = (items, level = 0) => (
    <ul className={level ? 'children' : 'category-tree'}>
      {items.map(cat => (
        <li key={cat.id}>
          <Link
            to="/"
            className={Number(category) === cat.id ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              setCategory(Number(category) === cat.id ? '' : String(cat.id));
            }}
          >
            {cat.name}
          </Link>
          {cat.children?.length > 0 && renderCategoryTree(cat.children, level + 1)}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <form className="search-form" onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="جستجو در نام یا توضیحات محصول..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">جستجو</button>
      </form>

      <div className="catalog-layout">
        <aside className="sidebar">
          <h3>دسته‌بندی</h3>
          {renderCategoryTree(categories)}
          <h3>فیلتر برند</h3>
          <input
            type="text"
            placeholder="برند"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <h3>قیمت</h3>
          <label>از (تومان)</label>
          <input
            type="number"
            placeholder="۰"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <label>تا (تومان)</label>
          <input
            type="number"
            placeholder="بدون حد"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </aside>

        <section className="products-section">
          <div className="sort-bar">
            <label>مرتب‌سازی:</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">جدیدترین</option>
              <option value="popularity">محبوبیت</option>
              <option value="price">قیمت</option>
              <option value="name">نام</option>
            </select>
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">نزولی</option>
              <option value="asc">صعودی</option>
            </select>
          </div>

          {loading ? (
            <p className="empty-state">در حال بارگذاری...</p>
          ) : products.length === 0 ? (
            <p className="empty-state">محصولی یافت نشد.</p>
          ) : (
            <div className="products-grid">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {recommended.length > 0 && (
            <>
              <h2 className="section-title">محصولات پیشنهادی</h2>
              <div className="products-grid">
                {recommended.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
