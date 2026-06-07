"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, Minus, Plus, QrCode, ShoppingBag, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type MenuItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  weight: string | null;
  photoUrl: string | null;
};

type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

type Props = {
  restaurantSlug: string;
  restaurantTitle: string;
  categories: MenuCategory[];
  showQr?: boolean;
};

type CartItem = {
  item: MenuItem;
  qty: number;
};

const DISH_FALLBACK = "/images/stock/menu/dish-fallback.jpg";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount) + " \u20BD";
}

function QrModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/restaurants/${slug}/menu-qr`)
      .then((r) => r.json())
      .then((d) => setQrSvg(d.svg))
      .catch(() => setQrSvg(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleDownload = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu-qr-${slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!qrSvg) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR-код меню</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif}svg{width:300px;height:300px}p{margin:12px 0 0;font-size:14px;color:#666}@media print{body{justify-content:flex-start;padding-top:40px}}</style></head><body>${qrSvg}<p>Наведите камеру на QR-код, чтобы открыть меню</p><script>window.print()</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="menu-qr-overlay" onClick={onClose}>
      <div className="menu-qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="menu-qr-modal-head">
          <h3>QR-код меню</h3>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>
        {loading ? (
          <div className="menu-qr-loading">Генерация...</div>
        ) : qrSvg ? (
          <>
            <div className="menu-qr-preview" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="menu-qr-hint">Гости смогут открыть меню, наведя камеру на QR-код</p>
            <div className="menu-qr-actions">
              <button className="secondary-button" type="button" onClick={handleDownload}>
                <Download size={15} />
                Скачать SVG
              </button>
              <button className="button" type="button" onClick={handlePrint}>
                Распечатать
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Не удалось сгенерировать QR-код</p>
        )}
      </div>
    </div>
  );
}

export function MenuOrderPage({ restaurantSlug, restaurantTitle, categories, showQr }: Props) {
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  const navRef = useRef<HTMLElement>(null);

  const totalItems = Array.from(cart.values()).reduce((s, c) => s + c.qty, 0);
  const totalPrice = Array.from(cart.values()).reduce((s, c) => s + c.item.price * c.qty, 0);

  const addItem = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      next.set(item.id, { item, qty: existing ? existing.qty + 1 : 1 });
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.qty <= 1) {
        next.delete(itemId);
      } else {
        next.set(itemId, { ...existing, qty: existing.qty - 1 });
      }
      return next;
    });
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(new Map());
    setMobileCartOpen(false);
  }, []);

  // Intersection observer for sticky nav highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        }
      },
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 }
    );
    categoryRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Scroll active nav pill into view (horizontal only, no page jump)
  useEffect(() => {
    if (!activeCategory || !navRef.current) return;
    const nav = navRef.current;
    const activeBtn = nav.querySelector(`[data-cat="${activeCategory}"]`) as HTMLElement | null;
    if (!activeBtn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollLeft = nav.scrollLeft + (btnRect.left - navRect.left) - (navRect.width / 2) + (btnRect.width / 2);
    nav.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeCategory]);

  // Lock body scroll when mobile cart or QR modal is open
  useEffect(() => {
    if (mobileCartOpen || qrOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileCartOpen, qrOpen]);

  const scrollToCategory = (catId: string) => {
    const el = categoryRefs.current.get(catId);
    // scrollIntoView respects the CSS scroll-margin-top set on .menu-order-category,
    // which accounts for the sticky header + sticky nav at every breakpoint.
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cartItems = Array.from(cart.values());

  return (
    <div className="page menu-order-page">
      <div className="menu-order-header">
        <div>
          <Link className="booking-top-return" href={`/restaurants/${restaurantSlug}`}>
            <span aria-hidden>&larr;</span>
            <span>К ресторану</span>
          </Link>
          <h1>Меню</h1>
          <p className="muted">{restaurantTitle}</p>
        </div>
        <div className="menu-order-header-actions">
          {showQr && (
            <button className="secondary-button" type="button" onClick={() => setQrOpen(true)}>
              <QrCode size={16} />
              QR-код
            </button>
          )}
          <a
            className="secondary-button"
            href={`/api/restaurants/${restaurantSlug}/menu-pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={16} />
            Скачать PDF
          </a>
        </div>
      </div>

      {categories.length > 0 && (
        <nav className="menu-order-nav" ref={navRef} aria-label="Категории меню">
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={`cat-${cat.id}`}
              className={activeCategory === `cat-${cat.id}` ? "is-active" : ""}
              onClick={() => scrollToCategory(`cat-${cat.id}`)}
              type="button"
            >
              {cat.title} <span>{cat.items.length}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="menu-order-body">
        <div className="menu-order-main">
          {categories.length > 0 ? (
            <div className="menu-order-categories">
              {categories.map((category) => (
                <section
                  className="menu-order-category"
                  key={category.id}
                  id={`cat-${category.id}`}
                  ref={(el) => {
                    if (el) categoryRefs.current.set(`cat-${category.id}`, el);
                  }}
                >
                  <h2>{category.title}</h2>
                  <div className="menu-order-grid">
                    {category.items.map((item) => {
                      const inCart = cart.get(item.id);
                      return (
                        <article className={`menu-dish-card${inCart ? " in-cart" : ""}`} key={item.id}>
                          <div className="menu-dish-image">
                            <Image
                              src={item.photoUrl || DISH_FALLBACK}
                              alt={item.title}
                              fill
                              sizes="(max-width: 760px) 50vw, 260px"
                            />
                            {inCart && <span className="menu-dish-badge">{inCart.qty}</span>}
                          </div>
                          <div className="menu-dish-body">
                            <strong>{item.title}</strong>
                            {item.description && <p>{item.description}</p>}
                            <div className="menu-dish-footer">
                              <div className="menu-dish-price-row">
                                {item.weight && <span className="menu-dish-weight">{item.weight}</span>}
                                <b>{formatMoney(item.price)}</b>
                              </div>
                              {inCart ? (
                                <div className="menu-qty-control">
                                  <button type="button" onClick={() => removeItem(item.id)} aria-label="Убрать">
                                    <Minus size={15} />
                                  </button>
                                  <span>{inCart.qty}</span>
                                  <button type="button" onClick={() => addItem(item)} aria-label="Добавить ещё">
                                    <Plus size={15} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="menu-add-btn"
                                  type="button"
                                  onClick={() => addItem(item)}
                                >
                                  <Plus size={15} />
                                  Добавить
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">Меню пока не добавлено.</div>
          )}

        </div>

        {/* Desktop sidebar cart */}
        <aside className={`menu-cart-sidebar${totalItems > 0 ? " has-items" : ""}`}>
          <div className="menu-cart-inner">
            <div className="menu-cart-head">
              <h3>
                <ShoppingBag size={18} />
                Мой заказ
              </h3>
              {totalItems > 0 && (
                <button className="menu-cart-clear" type="button" onClick={clearCart} aria-label="Очистить">
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="menu-cart-empty">
                <p>Добавьте блюда из меню, чтобы сформировать заказ</p>
              </div>
            ) : (
              <>
                <div className="menu-cart-items">
                  {cartItems.map(({ item, qty }) => (
                    <div className="menu-cart-row" key={item.id}>
                      <div className="menu-cart-row-image">
                        <Image
                          src={item.photoUrl || DISH_FALLBACK}
                          alt={item.title}
                          fill
                          sizes="52px"
                        />
                      </div>
                      <div className="menu-cart-row-info">
                        <strong>{item.title}</strong>
                        <span>{formatMoney(item.price * qty)}</span>
                      </div>
                      <div className="menu-qty-control compact">
                        <button type="button" onClick={() => removeItem(item.id)} aria-label="Убрать">
                          <Minus size={13} />
                        </button>
                        <span>{qty}</span>
                        <button type="button" onClick={() => addItem(item)} aria-label="Ещё">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        className="menu-cart-row-delete"
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        aria-label="Удалить"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="menu-cart-total">
                  <span>Итого</span>
                  <strong>{formatMoney(totalPrice)}</strong>
                </div>
                <div className="menu-cart-hint">
                  Обсудите ваш заказ с официантом
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile floating cart bar */}
      {totalItems > 0 && (
        <button
          className="menu-mobile-cart-bar"
          type="button"
          onClick={() => setMobileCartOpen(true)}
        >
          <span className="menu-mobile-cart-badge">{totalItems}</span>
          <span className="menu-mobile-cart-label">
            <ShoppingBag size={18} />
            Мой заказ
          </span>
          <strong>{formatMoney(totalPrice)}</strong>
        </button>
      )}

      {/* Mobile cart sheet */}
      {mobileCartOpen && (
        <div className="menu-cart-sheet-overlay" onClick={() => setMobileCartOpen(false)}>
          <div className="menu-cart-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="menu-cart-head">
              <h3>
                <ShoppingBag size={18} />
                Мой заказ
                <span className="menu-cart-count">{totalItems}</span>
              </h3>
              <div className="menu-cart-head-actions">
                <button type="button" onClick={clearCart} aria-label="Очистить" className="menu-cart-clear">
                  <Trash2 size={15} />
                </button>
                <button type="button" onClick={() => setMobileCartOpen(false)} aria-label="Закрыть" className="menu-cart-sheet-close">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="menu-cart-items">
              {cartItems.map(({ item, qty }) => (
                <div className="menu-cart-row" key={item.id}>
                  <div className="menu-cart-row-image">
                    <Image src={item.photoUrl || DISH_FALLBACK} alt={item.title} fill sizes="52px" />
                  </div>
                  <div className="menu-cart-row-info">
                    <strong>{item.title}</strong>
                    <span>{formatMoney(item.price * qty)}</span>
                  </div>
                  <div className="menu-qty-control compact">
                    <button type="button" onClick={() => removeItem(item.id)}>
                      <Minus size={13} />
                    </button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => addItem(item)}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <button className="menu-cart-row-delete" type="button" onClick={() => deleteItem(item.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="menu-cart-total">
              <span>Итого</span>
              <strong>{formatMoney(totalPrice)}</strong>
            </div>
            <div className="menu-cart-hint">
              Обсудите ваш заказ с официантом
            </div>
          </div>
        </div>
      )}

      {qrOpen && <QrModal slug={restaurantSlug} onClose={() => setQrOpen(false)} />}
    </div>
  );
}
