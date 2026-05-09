import express from 'express';
import { findPostBySlug, getAds, getPosts } from '../helpers/store.js';
import { buildMatchIndex, matchSlugFromName, normalizeMatchItem } from '../helpers/match-utils.js';

const router = express.Router();
const postStyles = ['/assets/css/styles.css', '/assets/css/blog.css'];
const parlayStyles = ['/assets/css/styles.css', '/assets/css/blog.css', '/assets/css/parlay.css'];
const matchStyles = ['/assets/css/styles.css', '/assets/css/blog.css', '/assets/css/parlay.css', '/assets/css/match.css'];

function fmtDate(date){
  return new Date(date || Date.now()).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}

function fmtDateTime(date){
  if (!date) return '';
  return new Date(date).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function siteUrl(req){
  return process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function categorySlug(category=''){
  return String(category || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function parlayUrl(post){
  return `/prediksi-parlay/${post.slug}`;
}

function matchUrl(match){
  const slug = match?.slug || matchSlugFromName(match?.match || '');
  return `/match/${slug}`;
}

router.get('/', async (req,res)=>{
  res.render('pages/home',{
    pageTitle:res.locals.settings.metaTitle||'Prediksi Bola',
    pageDescription:res.locals.settings.metaDescription||'',
    activePage:'home',
    styles:['/assets/css/styles.css'],
    scripts:['/assets/js/home.js'],
    bodyClass:'',
    fmtDate
  });
});

router.get('/live', (req,res)=>res.render('pages/live',{
  pageTitle:`Live Score • ${res.locals.settings.siteName||'Bandar Toto'}`,
  pageDescription:res.locals.settings.metaDescription||'',
  activePage:'live',
  styles:['/assets/css/styles.css','/assets/css/live.css'],
  scripts:['/assets/js/live.js'],
  bodyClass:''
}));

router.get('/live-score', (req,res)=>res.redirect(301, '/live'));

router.get('/prediksi-parlay', async (req,res)=>{
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = 6;
  const allPosts = await getPosts();
  const postsAll = allPosts.filter(p => categorySlug(p.category || 'Prediksi Parlay').includes('prediksi-parlay') || (p.predictions || []).length);
  const totalPages = Math.max(1, Math.ceil(postsAll.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const ads = await getAds();

  res.render('pages/prediksi-parlay',{
    pageTitle:'Prediksi Parlay Jitu Malam Ini',
    pageDescription:'Kumpulan prediksi parlay malam ini lengkap dengan tabel liga, pilihan 1X2, over under, skor, dan hot match.',
    activePage:'parlay',
    styles:parlayStyles,
    scripts:[],
    bodyClass:'body-parlay',
    posts: postsAll.slice(start, start + perPage),
    allPosts: postsAll,
    currentPage,
    totalPages,
    ads: ads.filter(a => a.active),
    canonical:`${siteUrl(req).replace(/\/+$/, '')}/prediksi-parlay`,
    fmtDate,
    parlayUrl,
    matchUrl
  });
});

router.get('/prediksi-parlay/:slug', async (req,res,next)=>{
  const post = await findPostBySlug(req.params.slug);
  if(!post) return next();
  const posts = await getPosts();
  const related = posts.filter(p => p.id !== post.id && (p.category === post.category || (p.predictions || []).length)).slice(0, 4);
  const ads = await getAds();
  const latestPosts = posts.filter(p => p.id !== post.id).slice(0, 8);

  res.render('pages/parlay-detail', {
    pageTitle: `${post.title} • ${res.locals.settings.siteName || 'Prediksi Bola'}`,
    pageDescription: post.excerpt || res.locals.settings.metaDescription || '',
    activePage:'parlay',
    styles:parlayStyles,
    scripts:[],
    bodyClass:'body-parlay',
    post,
    related,
    latestPosts,
    ads: ads.filter(a => a.active),
    canonical:`${siteUrl(req).replace(/\/+$/, '')}/prediksi-parlay/${post.slug}`,
    fmtDate,
    parlayUrl,
    matchUrl,
    normalizeMatchItem
  });
});

router.get('/match/:slug', async (req,res,next)=>{
  const posts = await getPosts();
  const matchRows = buildMatchIndex(posts);
  const match = matchRows.find(row => row.slug === req.params.slug);
  if (!match) return next();

  const relatedMatches = matchRows
    .filter(row => row.slug !== match.slug && (row.league === match.league || row.hotMatch))
    .slice(0, 6);

  const relatedPosts = posts
    .filter(post => post.slug !== match.postSlug && (post.predictions || []).length)
    .slice(0, 4);

  const ads = await getAds();

  res.render('pages/match-detail', {
    pageTitle: `${match.match} • Prediksi Bola`,
    pageDescription: `Prediksi ${match.match} lengkap dengan 1X2, over/under, skor, hot match, dan analisa AI.`,
    activePage:'match',
    styles:matchStyles,
    scripts:[],
    bodyClass:'body-parlay',
    match,
    relatedMatches,
    relatedPosts,
    latestPosts: posts.slice(0, 8),
    ads: ads.filter(a => a.active),
    canonical:`${siteUrl(req).replace(/\/+$/, '')}/match/${match.slug}`,
    fmtDate,
    fmtDateTime,
    parlayUrl,
    matchUrl
  });
});

router.get('/search', async (req,res)=>{
  const q = String(req.query.q || '').trim().toLowerCase();
  const all = await getPosts();
  const posts = q ? all.filter(p => [p.title,p.excerpt,p.category,(p.tags||[]).join(' ')].join(' ').toLowerCase().includes(q)) : [];
  res.render('pages/search', { pageTitle:`Search ${q}`, pageDescription:`Hasil pencarian ${q}`, activePage:'search', styles:postStyles, scripts:[], bodyClass:'body-parlay', posts, q, fmtDate, parlayUrl });
});

router.get('/category/:category', async (req,res)=>{
  const cat = req.params.category;
  const all = await getPosts();
  const posts = all.filter(p => categorySlug(p.category) === cat);
  res.render('pages/search', { pageTitle:`Kategori ${cat}`, pageDescription:`Post kategori ${cat}`, activePage:'category', styles:postStyles, scripts:[], bodyClass:'body-parlay', posts, q:`Kategori: ${cat}`, fmtDate, parlayUrl });
});

router.get('/sitemap.xml', async (req,res)=>{
  const base = siteUrl(req).replace(/\/+$/, '');
  const posts = await getPosts();
  const matches = buildMatchIndex(posts);
  const urls = ['/', '/live', '/prediksi-parlay', ...posts.map(p => `/prediksi-parlay/${p.slug}`), ...matches.map(m => `/match/${m.slug}`)];
  const uniqueUrls = [...new Set(urls)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueUrls.map(u => `\n  <url><loc>${base}${u}</loc></url>`).join('')}\n</urlset>`);
});

router.get('/robots.txt', (req,res)=>{
  const base = siteUrl(req).replace(/\/+$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
});

router.get('/:slug', async (req,res,next)=>{
  const post = await findPostBySlug(req.params.slug);
  if(!post) return next();
  return res.redirect(301, `/prediksi-parlay/${post.slug}`);
});

export default router;
