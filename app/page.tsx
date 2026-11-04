"use client";

import { useEffect, useMemo, useState } from "react";

type IconName =
  | "arrow"
  | "bell"
  | "bid"
  | "building"
  | "calendar"
  | "car"
  | "chevron"
  | "clock"
  | "close"
  | "heart"
  | "jewel"
  | "menu"
  | "phone"
  | "plate"
  | "search"
  | "sell"
  | "user";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" {...common} /><path d="m14 7 5 5-5 5" {...common} /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} /><path d="M10 21h4" {...common} /></>,
    bid: <><path d="m5 11 6-6 4 4-6 6z" {...common} /><path d="m13 7 4 4" {...common} /><path d="m2 21 8-8" {...common} /><path d="M14 17h7v4h-7z" {...common} /></>,
    building: <><path d="M4 21V5l8-3 8 3v16" {...common} /><path d="M9 21v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" {...common} /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...common} /><path d="M16 3v4M8 3v4M3 10h18" {...common} /></>,
    car: <><path d="m5 11 1.5-4h11l1.5 4" {...common} /><path d="M3 12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3z" {...common} /><path d="M6 17v2M18 17v2M7 14h.01M17 14h.01" {...common} /></>,
    chevron: <path d="m9 18 6-6-6-6" {...common} />,
    clock: <><circle cx="12" cy="12" r="9" {...common} /><path d="M12 7v5l3 2" {...common} /></>,
    close: <><path d="m6 6 12 12" {...common} /><path d="m18 6-12 12" {...common} /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" {...common} />,
    jewel: <><path d="m3 9 4-5h10l4 5-9 12z" {...common} /><path d="M3 9h18M7 4l5 17 5-17" {...common} /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" {...common} /></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2" {...common} /><path d="M11 18h2" {...common} /></>,
    plate: <><rect x="2.5" y="6" width="19" height="12" rx="2" {...common} /><path d="M7 10h10M7 14h6" {...common} /></>,
    search: <><circle cx="11" cy="11" r="7" {...common} /><path d="m20 20-4-4" {...common} /></>,
    sell: <><path d="M20 12 12 4H5a2 2 0 0 0-2 2v7l8 8z" {...common} /><circle cx="7.5" cy="8.5" r="1" {...common} /></>,
    user: <><circle cx="12" cy="8" r="4" {...common} /><path d="M4 21a8 8 0 0 1 16 0" {...common} /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      {paths[name]}
    </svg>
  );
}

const heroSlides = [
  {
    kicker: "Live auctions across the UAE",
    title: "Own the extraordinary.",
    body: "Discover exceptional vehicles, plate numbers, property and collectibles in one trusted marketplace.",
    cta: "Explore live auctions",
    image: "https://cdn.emiratesauction.com/media/d9p4y93ymqcjvn6ms9yybuq5dd9octjf7e3paez14vlrqfd88/t_,w_1600,h_900/images.jpg",
    theme: "vehicle",
  },
  {
    kicker: "Distinctive plate numbers",
    title: "A number that says more.",
    body: "Bid on premium number plates from across the Emirates, with secure online participation.",
    cta: "View plate numbers",
    image: "",
    theme: "plate",
  },
  {
    kicker: "Property opportunities",
    title: "Your next address awaits.",
    body: "Explore residential and commercial properties through a clear, transparent auction journey.",
    cta: "Browse properties",
    image: "https://cdn.emiratesauction.com/media/1qxx78g0plxog0g93hwq51cn68ehltssftgnp9d319jmwdm9d/t_,w_1600,h_900/images.jpg",
    theme: "property",
  },
];

const categories = [
  { id: "vehicles", label: "Vehicles & Machinery", count: "1,277", icon: "car" as IconName },
  { id: "plates", label: "Plate Numbers", count: "332", icon: "plate" as IconName },
  { id: "properties", label: "Properties", count: "50", icon: "building" as IconName },
  { id: "jewellery", label: "Jewellery & Watches", count: "25", icon: "jewel" as IconName },
];

const lots = [
  {
    id: 1,
    category: "vehicles",
    title: "BMW X4 xDrive 30i",
    lot: "Lot #842771",
    price: "78,000",
    bids: 19,
    time: "01h 24m 18s",
    image: "https://cdn.emiratesauction.com/media/d9p4y93ymqcjvn6ms9yybuq5dd9octjf7e3paez14vlrqfd88/t_,w_960,h_640/images.jpg",
    tag: "Ending today",
  },
  {
    id: 2,
    category: "vehicles",
    title: "BMW X5 M Competition",
    lot: "Lot #842764",
    price: "215,000",
    bids: 31,
    time: "02h 08m 42s",
    image: "https://cdn.emiratesauction.com/media/1rgzxk5cof3jhcpfknwd36wy7g2a3v0dmqykdix8qndpmrq431/t_,w_960,h_640/images.jpg",
    tag: "Hot lot",
  },
  {
    id: 3,
    category: "machinery",
    title: "Sakki Industrial Generator",
    lot: "Lot #842690",
    price: "12,500",
    bids: 8,
    time: "03h 46m 03s",
    image: "https://cdn.emiratesauction.com/media/2e2l2eb810bloe7v9vbu7cwa8e5dl20rbn0kk1e4ek9sxu9vvt/t_,w_960,h_640/images.jpg",
    tag: "Ending today",
  },
  {
    id: 4,
    category: "items",
    title: "Premium General Items Lot",
    lot: "Lot #842621",
    price: "4,250",
    bids: 12,
    time: "04h 12m 27s",
    image: "https://cdn.emiratesauction.com/media/mq9c18afza9966jly00m78vry2swk1rvzpc7ueb9n1xdy1h3r/t_,w_960,h_640/images.jpg",
    tag: "No reserve",
  },
];

const faqItems = [
  {
    question: "How do I register for an auction?",
    answer: "Create an account, complete the required identity details and add the refundable auction deposit shown for the auction you want to join.",
  },
  {
    question: "Can I bid from outside the UAE?",
    answer: "Yes. Online auctions are designed for remote participation. Eligibility and delivery requirements may vary by category and lot.",
  },
  {
    question: "What happens after I win?",
    answer: "Your account shows the invoice and payment instructions. Once payment and transfer requirements are completed, collection or delivery can be arranged.",
  },
];

function Header({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (value: boolean) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="utility-bar">
          <div className="container utility-inner">
            <nav aria-label="Utility navigation">
              <a href="#about">About EA</a>
              <a href="#calendar">Auction Calendar</a>
              <a href="#sell">Sell with us</a>
              <a href="#help">Help</a>
              <a href="#contact">Contact Us</a>
            </nav>
            <div className="utility-right">
              <a href="tel:600545454">UAE: 600 545 454</a>
              <span className="separator" />
              <button type="button">العربية</button>
            </div>
          </div>
        </div>

        <div className="main-nav">
          <div className="container nav-inner">
            <a className="brand" href="#top" aria-label="Emirates Auction home">
              <img src="https://www.emiratesauction.com/assets/NewHeaderRevamp2Icons/logo.svg" alt="Emirates Auction" />
            </a>

            <nav className="desktop-nav" aria-label="Main navigation">
              <a href="#auctions">Auctions</a>
              <a href="#direct-sale">Direct Sale</a>
              <a href="#services">Services</a>
              <a href="#sell">Sell</a>
            </nav>

            <div className="nav-actions">
              <button className="icon-button search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Search">
                <Icon name="search" size={22} />
              </button>
              <button className="login-button" type="button"><Icon name="user" size={19} /> Login</button>
              <button className="primary-button compact" type="button">Create Account</button>
              <button className="icon-button menu-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
                <Icon name={menuOpen ? "close" : "menu"} size={26} />
              </button>
            </div>
          </div>
        </div>

        <div className="category-nav">
          <div className="container category-nav-inner">
            <a className="all-categories" href="#categories"><Icon name="menu" size={18} /> All Categories</a>
            <a href="#vehicles">Vehicles & Machinery</a>
            <a href="#plates">Plate Numbers</a>
            <a href="#properties">Properties</a>
            <a href="#jewellery">Jewellery & Watches</a>
            <a href="#items">General Items</a>
            <a className="ending-link" href="#ending"><span /> Ending Today</a>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <a href="#auctions" onClick={() => setMenuOpen(false)}>Auctions</a>
            <a href="#direct-sale" onClick={() => setMenuOpen(false)}>Direct Sale</a>
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#sell" onClick={() => setMenuOpen(false)}>Sell with us</a>
            <a href="#help" onClick={() => setMenuOpen(false)}>Help & Support</a>
            <div className="mobile-menu-actions">
              <button type="button" className="login-button">Login</button>
              <button type="button" className="primary-button compact">Create Account</button>
            </div>
          </div>
        )}
      </header>

      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search auctions">
          <button className="search-close" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><Icon name="close" size={28} /></button>
          <form className="search-panel" onSubmit={(event) => event.preventDefault()}>
            <span>Search the marketplace</span>
            <div className="search-field">
              <Icon name="search" size={25} />
              <input autoFocus placeholder="Search vehicles, plate numbers, properties..." aria-label="Search query" />
              <button type="submit">Search</button>
            </div>
            <small>Popular: BMW, Dubai plate, villa, watches</small>
          </form>
        </div>
      )}
    </>
  );
}

function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % heroSlides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const slide = heroSlides[active];

  return (
    <section className={`hero hero-${slide.theme}`} id="top">
      {slide.image && <div className="hero-image" style={{ backgroundImage: `url(${slide.image})` }} />}
      <div className="hero-shade" />
      {slide.theme === "plate" && (
        <div className="plate-visual" aria-hidden="true">
          <div className="plate-card plate-back"><span>UAE</span><strong>7</strong></div>
          <div className="plate-card plate-front"><span>FUJAIRAH</span><strong>18</strong><small>الفجيرة</small></div>
        </div>
      )}
      <div className="container hero-content">
        <span className="prototype-pill">UI prototype · mock data</span>
        <p className="eyebrow">{slide.kicker}</p>
        <h1>{slide.title}</h1>
        <p className="hero-copy">{slide.body}</p>
        <div className="hero-actions">
          <a className="primary-button" href="#ending">{slide.cta} <Icon name="arrow" size={19} /></a>
          <a className="text-link light" href="#how-it-works">How it works <Icon name="chevron" size={17} /></a>
        </div>
      </div>
      <div className="hero-controls container">
        <div className="hero-dots" aria-label="Hero slides">
          {heroSlides.map((item, index) => (
            <button key={item.title} type="button" className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}`} />
          ))}
        </div>
        <div className="hero-status">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <div className="hero-progress"><i key={active} /></div>
          <span>{String(heroSlides.length).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip() {
  return (
    <section className="quick-categories" id="categories" aria-label="Auction categories">
      <div className="container category-grid">
        {categories.map((category) => (
          <a href={`#${category.id}`} className="quick-category" key={category.id}>
            <span className="category-icon"><Icon name={category.icon} size={28} /></span>
            <span><strong>{category.label}</strong><small>{category.count} live listings</small></span>
            <Icon name="chevron" size={19} />
          </a>
        ))}
      </div>
    </section>
  );
}

function LotCard({ lot, watched, onWatch }: { lot: (typeof lots)[number]; watched: boolean; onWatch: () => void }) {
  return (
    <article className="lot-card">
      <div className="lot-media">
        <img src={lot.image} alt={lot.title} />
        <span className={`lot-tag ${lot.tag === "Hot lot" ? "hot" : ""}`}>{lot.tag}</span>
        <button type="button" className={`watch-button ${watched ? "watched" : ""}`} onClick={onWatch} aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}>
          <Icon name="heart" size={20} />
        </button>
      </div>
      <div className="lot-body">
        <p className="lot-number">{lot.lot}</p>
        <h3>{lot.title}</h3>
        <div className="lot-price-row">
          <span>Current bid</span>
          <strong><small>AED</small> {lot.price}</strong>
        </div>
        <div className="lot-meta">
          <span><Icon name="bid" size={17} /> {lot.bids} bids</span>
          <span className="countdown"><Icon name="clock" size={17} /> {lot.time}</span>
        </div>
        <button className="bid-button" type="button">Place bid <Icon name="arrow" size={18} /></button>
      </div>
    </article>
  );
}

function EndingToday() {
  const [filter, setFilter] = useState("all");
  const [watched, setWatched] = useState<number[]>([]);
  const displayedLots = useMemo(() => filter === "all" ? lots : lots.filter((lot) => lot.category === filter), [filter]);

  return (
    <section className="section ending-section" id="ending">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow red">Bid before the clock runs out</p>
            <h2>Ending today</h2>
          </div>
          <a className="text-link" href="#auctions">View all auctions <Icon name="arrow" size={18} /></a>
        </div>
        <div className="filter-row" role="tablist" aria-label="Filter auction lots">
          {[
            ["all", "All lots"],
            ["vehicles", "Vehicles"],
            ["machinery", "Machinery"],
            ["items", "General items"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <div className="lot-grid">
          {displayedLots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              watched={watched.includes(lot.id)}
              onWatch={() => setWatched((current) => current.includes(lot.id) ? current.filter((id) => id !== lot.id) : [...current, lot.id])}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DirectSale() {
  const plateLots = [
    { emirate: "SHARJAH", ar: "الشارقة", number: "8118", code: "2", price: "28,500" },
    { emirate: "AJMAN", ar: "عجمان", number: "505", code: "A", price: "74,000" },
    { emirate: "RAK", ar: "رأس الخيمة", number: "77", code: "V", price: "135,000" },
  ];

  return (
    <section className="section direct-sale-section" id="direct-sale">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow red">Skip the bidding</p>
            <h2>Direct sale plate numbers</h2>
            <p className="section-intro">Secure a distinctive number instantly at a fixed price.</p>
          </div>
          <a className="secondary-button" href="#plates">Browse all numbers <Icon name="arrow" size={18} /></a>
        </div>
        <div className="plates-grid">
          {plateLots.map((plate) => (
            <article className="plate-sale-card" key={`${plate.emirate}-${plate.number}`}>
              <div className="sale-plate">
                <div className="plate-code"><b>{plate.code}</b><small>UAE</small></div>
                <div className="plate-center"><span>{plate.emirate}</span><strong>{plate.number}</strong><small>{plate.ar}</small></div>
              </div>
              <div className="plate-sale-info">
                <span>Buy now</span>
                <strong><small>AED</small> {plate.price}</strong>
                <button type="button">View details <Icon name="chevron" size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="section services-section" id="services">
      <div className="container">
        <div className="section-heading centered">
          <p className="eyebrow red">More than an auction house</p>
          <h2>Everything you need, in one place</h2>
          <p className="section-intro">Services designed for buyers, sellers and vehicle owners across the UAE.</p>
        </div>
        <div className="service-grid">
          <article className="service-card service-dark" id="sell">
            <span className="service-number">01</span>
            <span className="service-icon"><Icon name="sell" size={31} /></span>
            <h3>Sell with us</h3>
            <p>Reach a broad audience and manage the complete sale journey with experienced auction specialists.</p>
            <a href="#contact">Start selling <Icon name="arrow" size={18} /></a>
          </article>
          <article className="service-card">
            <span className="service-number">02</span>
            <span className="service-icon"><Icon name="plate" size={31} /></span>
            <h3>Request a number</h3>
            <p>Tell us the plate number you are looking for and register your interest in a few simple steps.</p>
            <a href="#contact">Send a request <Icon name="arrow" size={18} /></a>
          </article>
          <article className="service-card service-image">
            <div className="service-image-overlay" />
            <span className="service-number">03</span>
            <span className="service-icon"><Icon name="car" size={31} /></span>
            <h3>Roadside assistance</h3>
            <p>24/7 towing, battery support, tyre assistance and vehicle logistics when you need them.</p>
            <a href="#contact">Get assistance <Icon name="arrow" size={18} /></a>
          </article>
        </div>
      </div>
    </section>
  );
}

function TrustBand() {
  const stats = [
    ["32+", "offices and branches"],
    ["7", "Emirates covered"],
    ["24/7", "roadside assistance"],
    ["4", "digital access channels"],
  ];
  return (
    <section className="trust-band" id="about">
      <div className="container trust-layout">
        <div className="trust-copy">
          <p className="eyebrow">Built on trust</p>
          <h2>Connecting opportunities across the Emirates.</h2>
          <p>From rare plate numbers to vehicles, property and specialised assets, Emirates Auction brings transparent digital bidding to a diverse marketplace.</p>
          <a className="text-link light" href="#news">Discover our story <Icon name="arrow" size={18} /></a>
        </div>
        <div className="stats-grid">
          {stats.map(([value, label]) => <div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: "user" as IconName, title: "Create your account", body: "Register and complete your profile securely." },
    { icon: "search" as IconName, title: "Find your opportunity", body: "Explore categories and review all lot details." },
    { icon: "bid" as IconName, title: "Place your bid", body: "Join online from anywhere and follow the auction live." },
    { icon: "car" as IconName, title: "Complete & collect", body: "Pay securely and arrange transfer or collection." },
  ];
  return (
    <section className="section how-section" id="how-it-works">
      <div className="container">
        <div className="section-heading centered">
          <p className="eyebrow red">Simple. Secure. Transparent.</p>
          <h2>How online bidding works</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step" key={step.title}>
              <span className="step-index">0{index + 1}</span>
              <div className="step-icon"><Icon name={step.icon} size={29} /></div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {index < steps.length - 1 && <span className="step-line" />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function News() {
  const stories = [
    {
      date: "12 OCT 2026",
      title: "A platform where exceptional assets find their next owner",
      image: "https://www.emiratesauction.com/imagescdn/94eb0c85-d5d3-46ef-fd3b-10127bd83d00/width=1440,height=810?ver=100",
    },
    {
      date: "03 SEP 2026",
      title: "Digital auctions supporting remarkable charitable initiatives",
      image: "https://www.emiratesauction.com/imagescdn/cfce6358-0835-4f5e-299c-566846841b00/width=1440,height=810?ver=100",
    },
    {
      date: "19 AUG 2026",
      title: "A smarter, simpler auction experience across every screen",
      image: "https://cdn.emiratesauction.com/media/1f30lcwby9jg9svcksz332807482htpemanaeg5n89bosboudo/t_,w_960,h_960,wm_0,tr_1/images.jpg",
    },
  ];
  return (
    <section className="section news-section" id="news">
      <div className="container">
        <div className="section-heading split-heading">
          <div><p className="eyebrow red">Latest from EA</p><h2>News & stories</h2></div>
          <a className="text-link" href="#news">View all news <Icon name="arrow" size={18} /></a>
        </div>
        <div className="news-grid">
          {stories.map((story, index) => (
            <article className={`news-card ${index === 0 ? "featured-news" : ""}`} key={story.title}>
              <img src={story.image} alt="" />
              <div className="news-shade" />
              <div className="news-content"><span>{story.date}</span><h3>{story.title}</h3><a href="#news" aria-label={`Read ${story.title}`}>Read story <Icon name="arrow" size={18} /></a></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq-section" id="help">
      <div className="container faq-layout">
        <div className="faq-heading">
          <p className="eyebrow red">Help centre</p>
          <h2>Questions? We have answers.</h2>
          <p>Find the essentials for registering, bidding and completing your purchase.</p>
          <a className="secondary-button" href="#contact">Visit help centre <Icon name="arrow" size={18} /></a>
        </div>
        <div className="accordion">
          {faqItems.map((item, index) => (
            <article className={`faq-item ${open === index ? "open" : ""}`} key={item.question}>
              <button type="button" onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>
                <span>{item.question}</span><i>{open === index ? "−" : "+"}</i>
              </button>
              <div className="faq-answer"><p>{item.answer}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppBanner() {
  return (
    <section className="app-banner">
      <div className="container app-layout">
        <div className="app-copy">
          <p className="eyebrow">Bid wherever you are</p>
          <h2>The auction is always in your hands.</h2>
          <p>Follow lots, receive instant alerts and place bids securely from the Emirates Auction app.</p>
          <div className="store-buttons">
            <a href="#app"><span>Download on the</span><strong>App Store</strong></a>
            <a href="#app"><span>Get it on</span><strong>Google Play</strong></a>
            <a href="#app"><span>Explore it on</span><strong>AppGallery</strong></a>
          </div>
        </div>
        <div className="phone-visual" aria-hidden="true">
          <div className="phone-frame phone-back"><div className="phone-notch" /><div className="mini-card red-mini"><span>LIVE</span><b>Plate 18</b></div><div className="mini-row" /><div className="mini-row short" /></div>
          <div className="phone-frame phone-front"><div className="phone-notch" /><span className="phone-logo">EA</span><div className="mini-car"><Icon name="car" size={56} /></div><small>Current bid</small><strong>AED 78,000</strong><button type="button">Place bid</button></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container footer-top">
        <div className="footer-brand">
          <img src="https://www.emiratesauction.com/assets/NewHeaderRevamp2Icons/logo.svg" alt="Emirates Auction" />
          <p>The region&apos;s trusted digital marketplace for auctions, direct sales and specialist services.</p>
          <div className="support-number"><span>Customer support</span><a href="tel:600545454">600 545 454</a></div>
        </div>
        <div className="footer-links"><h3>Marketplace</h3><a href="#auctions">Live auctions</a><a href="#ending">Ending today</a><a href="#direct-sale">Direct sale</a><a href="#calendar">Auction calendar</a></div>
        <div className="footer-links"><h3>Categories</h3><a href="#vehicles">Vehicles</a><a href="#plates">Plate numbers</a><a href="#properties">Properties</a><a href="#jewellery">Jewellery</a></div>
        <div className="footer-links"><h3>Company</h3><a href="#about">About us</a><a href="#sell">Sell with us</a><a href="#news">News</a><a href="#help">Help centre</a></div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Emirates Auction UI concept. Local prototype only.</span>
        <div><a href="#privacy">Privacy</a><a href="#terms">Terms & conditions</a><a href="#accessibility">Accessibility</a></div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        <Hero />
        <CategoryStrip />
        <EndingToday />
        <DirectSale />
        <Services />
        <TrustBand />
        <HowItWorks />
        <News />
        <Faq />
        <AppBanner />
      </main>
      <Footer />
    </>
  );
}
