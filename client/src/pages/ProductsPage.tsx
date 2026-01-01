import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import './ProductsPage.css';

interface Product {
  id: number;
  nombre: string;
  descripcion_corta: string;
  precio: number;
  imagen: string | null;
  categorias: string[];
  categoria_slugs: string[];
}

interface Category {
  id: number;
  nombre: string;
  slug: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/productos');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categorias');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.categoria_slugs.includes(selectedCategory));

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    addItem({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagen: product.imagen
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    console.log('Product added to cart:', product.nombre);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="container">
        {/* Header */}
        <div className="products-header">
          <h1 className="products-title">Productos</h1>
          <p className="products-subtitle">Descubre nuestra colección completa</p>
        </div>

        {/* Filtros */}
        <div className="products-filters">
          <div className="filter-group">
            <label className="filter-label">Categorías:</label>
            <div className="filter-chips">
              <button
                className={`chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`chip ${selectedCategory === category.slug ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.slug)}
                >
                  {category.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de productos */}
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <div className="no-products-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </div>
              <h3>No se encontraron productos</h3>
              <p>Intenta con otra categoría o vuelve más tarde.</p>
            </div>
          ) : (
            <>
              {filteredProducts.map((product) => (
                <div key={product.id} className="card product-card">
                  <Link to={`/producto/${product.id}`} className="product-link">
                    <div className="product-image">
                      {product.imagen ? (
                        <>
                          <img src={`/uploads/${product.imagen}`} alt={product.nombre} />
                          <div className="product-overlay">
                            <span className="quick-view">Vista rápida</span>
                          </div>
                        </>
                      ) : (
                        <div className="product-placeholder">
                          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="product-info">
                      <div className="product-details-section">
                        <div className="product-categories">
                          {product.categorias.map((cat, index) => (
                            <span key={index} className="chip">
                              {cat}
                            </span>
                          ))}
                        </div>

                        <h3 className="product-name">{product.nombre}</h3>

                        {product.descripcion_corta && (
                          <p className="product-description">{product.descripcion_corta}</p>
                        )}
                      </div>

                      <div className="product-footer">
                        <div className="price-section">
                          <span className="product-price">${product.precio.toFixed(2)}</span>
                          {product.precio > 100 && (
                            <span className="price-badge">Popular</span>
                          )}
                        </div>
                        <span className="btn btn-primary btn-small">Ver más</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
